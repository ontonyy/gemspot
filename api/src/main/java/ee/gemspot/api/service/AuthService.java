package ee.gemspot.api.service;

import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.RefreshToken;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.domain.UserRole;
import ee.gemspot.api.dto.AuthResponseDto;
import ee.gemspot.api.dto.AuthUserDto;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.RefreshTokenRepository;
import ee.gemspot.api.repository.UserRepository;
import ee.gemspot.api.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/**
 * Email+password auth + Google OAuth, 1:1 port of the Nest AuthService (D3).
 * Access token (15m) + refresh token (30d), both stateless JWTs. Adds D4
 * refresh-token reuse detection: each refresh jti is a DB row in a family;
 * replay of a used jti kills the family (session revoked, 401).
 *
 * <p>Wire shape unchanged from Nest/mock — frontend untouched.
 */
@Service
public class AuthService {

    private final UserRepository users;
    private final ProfileRepository profiles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final RestClient restClient = RestClient.create();

    public AuthService(
            UserRepository users,
            ProfileRepository profiles,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder,
            JwtService jwt) {
        this.users = users;
        this.profiles = profiles;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResponseDto register(String emailIn, String password, String nameIn) {
        String email = emailIn.toLowerCase().trim();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user = users.save(user);

        String name = nameIn != null && !nameIn.trim().isEmpty() ? nameIn.trim() : null;
        Profile profile = new Profile();
        profile.setUserId(user.getId());
        profile.setName(name);
        profiles.save(profile);

        return session(user.getId(), user.getEmail(), user.getRole(), name, UUID.randomUUID().toString());
    }

    @Transactional
    public AuthResponseDto login(String emailIn, String password) {
        String email = emailIn.toLowerCase().trim();
        User user = users.findByEmail(email).orElse(null);
        // OAuth-only accounts have no local password — reject password login for them.
        if (user == null || user.getPasswordHash() == null
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return session(user.getId(), user.getEmail(), user.getRole(), nameOf(user.getId()),
                UUID.randomUUID().toString());
    }

    /* Google sign-in. Verify the ID token against Google's tokeninfo endpoint,
       check audience + email_verified, then link by verified email: an existing
       account gains the provider link; a new email creates an OAuth-only account
       (passwordHash null). Issue our own JWT. */
    @Transactional
    public AuthResponseDto oauthGoogle(String idToken) {
        String clientId = System.getenv("GOOGLE_CLIENT_ID");
        if (clientId == null || clientId.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google sign-in is not configured");
        }

        Map<String, Object> claims;
        try {
            claims = restClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token="
                            + URLEncoder.encode(idToken, StandardCharsets.UTF_8))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Google sign-in");
        }
        if (claims == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Google sign-in");
        }

        Object aud = claims.get("aud");
        Object sub = claims.get("sub");
        Object emailClaim = claims.get("email");
        Object emailVerified = claims.get("email_verified");
        boolean verified = Boolean.TRUE.equals(emailVerified) || "true".equals(emailVerified);

        if (!clientId.equals(aud)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token audience mismatch");
        }
        if (sub == null || emailClaim == null || !verified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google account email is not verified");
        }
        String email = emailClaim.toString().toLowerCase().trim();
        String providerId = sub.toString();

        User existing = users.findByEmail(email).orElse(null);
        if (existing != null) {
            if (!"google".equals(existing.getProvider())) {
                existing.setProvider("google");
                existing.setProviderId(providerId);
                users.save(existing);
            }
            return session(existing.getId(), existing.getEmail(), existing.getRole(),
                    nameOf(existing.getId()), UUID.randomUUID().toString());
        }

        Object nameClaim = claims.get("name");
        String name = nameClaim != null && !nameClaim.toString().trim().isEmpty()
                ? nameClaim.toString().trim() : null;
        User user = new User();
        user.setEmail(email);
        user.setProvider("google");
        user.setProviderId(providerId);
        user = users.save(user);

        Profile profile = new Profile();
        profile.setUserId(user.getId());
        profile.setName(name);
        profiles.save(profile);

        return session(user.getId(), user.getEmail(), user.getRole(), name, UUID.randomUUID().toString());
    }

    /* D4 reuse detection. NOT @Transactional: the family-revoke delete must
       commit even though we then return 401 (a surrounding tx would roll it
       back). Derived delete runs in its own transaction. */
    public AuthResponseDto refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwt.parseRefresh(refreshToken);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        if (!"refresh".equals(claims.get("typ", String.class))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        String jti = claims.get("jti", String.class);
        RefreshToken row = jti != null ? refreshTokens.findByJti(jti).orElse(null) : null;
        if (row == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        if (row.isUsed()) {
            // Replay of an already-rotated token → revoke the whole family.
            refreshTokens.deleteByFamilyId(row.getFamilyId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        User user = users.findById(claims.getSubject()).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        // Rotate: mark presented jti used, issue a new pair in the SAME family.
        row.setUsed(true);
        refreshTokens.save(row);
        return session(user.getId(), user.getEmail(), user.getRole(), nameOf(user.getId()),
                row.getFamilyId());
    }

    @Transactional(readOnly = true)
    public AuthUserDto me(String userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
        return new AuthUserDto(user.getId(), user.getEmail(), nameOf(user.getId()), user.getRole().name());
    }

    private String nameOf(String userId) {
        return profiles.findByUserId(userId).map(Profile::getName).orElse(null);
    }

    private AuthResponseDto session(String id, String email, UserRole role, String name, String familyId) {
        String access = jwt.createAccess(id, email, role.name());
        String jti = UUID.randomUUID().toString();
        JwtService.RefreshSigned refresh = jwt.createRefresh(id, jti, familyId);

        RefreshToken row = new RefreshToken();
        row.setJti(jti);
        row.setUserId(id);
        row.setFamilyId(familyId);
        row.setUsed(false);
        row.setExpiresAt(refresh.expiresAt());
        refreshTokens.save(row);

        return new AuthResponseDto(new AuthUserDto(id, email, name, role.name()), access, refresh.token());
    }
}
