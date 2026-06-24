package ee.gemspot.api.service;

import ee.gemspot.api.domain.EmailChangeToken;
import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.RefreshToken;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.dto.AuthResponseDto;
import ee.gemspot.api.dto.AuthUserDto;
import ee.gemspot.api.repository.EmailChangeTokenRepository;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.RefreshTokenRepository;
import ee.gemspot.api.repository.UserRepository;
import ee.gemspot.api.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
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
    private final EmailChangeTokenRepository emailChangeTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final SessionService sessions;
    private final MailService mail;
    private final String webUrl;
    private final RestClient restClient = RestClient.create();

    /** Email-change links live for 24h. */
    private static final Duration EMAIL_CHANGE_TTL = Duration.ofHours(24);

    public AuthService(
            UserRepository users,
            ProfileRepository profiles,
            RefreshTokenRepository refreshTokens,
            EmailChangeTokenRepository emailChangeTokens,
            PasswordEncoder passwordEncoder,
            JwtService jwt,
            SessionService sessions,
            MailService mail,
            @Value("${app.web-url:http://localhost:5173}") String webUrl) {
        this.users = users;
        this.profiles = profiles;
        this.refreshTokens = refreshTokens;
        this.emailChangeTokens = emailChangeTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.sessions = sessions;
        this.mail = mail;
        this.webUrl = webUrl;
    }

    /** Test seam: inject a RestClient bound to MockRestServiceServer. */
    void setRestClient(RestClient restClient) {
        this.restClient = restClient;
    }

    /** Test seam: overridable env read (Mockito spy) — prod returns System.getenv. */
    protected String env(String key) {
        return System.getenv(key);
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

        return session(user, UUID.randomUUID().toString());
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
        return session(user, UUID.randomUUID().toString());
    }

    /* Google sign-in. Verify the ID token against Google's tokeninfo endpoint,
       check audience + email_verified, then link by verified email: an existing
       account gains the provider link; a new email creates an OAuth-only account
       (passwordHash null). Issue our own JWT. */
    @Transactional
    public AuthResponseDto oauthGoogle(String idToken) {
        String clientId = env("GOOGLE_CLIENT_ID");
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
            return session(existing, UUID.randomUUID().toString());
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

        return session(user, UUID.randomUUID().toString());
    }

    /* Facebook sign-in. Mirrors oauthGoogle: verify the user access token against
       the Graph API, require a verified email, then link by verified email — an
       existing account gains the provider link; a new email creates an OAuth-only
       account (passwordHash null). Issue our own JWT.

       Verification: GET /debug_token with an app access token (APP_ID|APP_SECRET)
       and confirm data.is_valid + data.app_id == our APP_ID; then GET /me for the
       profile. Facebook only returns `email` for accounts with a confirmed email,
       so a present, non-empty email is our verified-email signal. */
    @Transactional
    public AuthResponseDto oauthFacebook(String accessToken) {
        String appId = env("FACEBOOK_APP_ID");
        String appSecret = env("FACEBOOK_APP_SECRET");
        if (appId == null || appId.isEmpty() || appSecret == null || appSecret.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Facebook sign-in is not configured");
        }

        String appToken = appId + "|" + appSecret;
        Map<String, Object> debug;
        try {
            Map<String, Object> resp = restClient.get()
                    .uri("https://graph.facebook.com/debug_token?input_token="
                            + URLEncoder.encode(accessToken, StandardCharsets.UTF_8)
                            + "&access_token=" + URLEncoder.encode(appToken, StandardCharsets.UTF_8))
                    .retrieve()
                    .body(Map.class);
            Object data = resp != null ? resp.get("data") : null;
            debug = data instanceof Map ? (Map<String, Object>) data : null;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Facebook sign-in");
        }
        if (debug == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Facebook sign-in");
        }
        Object isValid = debug.get("is_valid");
        boolean valid = Boolean.TRUE.equals(isValid) || "true".equals(isValid);
        if (!valid || !appId.equals(String.valueOf(debug.get("app_id")))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Facebook sign-in");
        }

        Map<String, Object> me;
        try {
            me = restClient.get()
                    .uri("https://graph.facebook.com/me?fields=id,email,name&access_token="
                            + URLEncoder.encode(accessToken, StandardCharsets.UTF_8))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Facebook sign-in");
        }
        if (me == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify Facebook sign-in");
        }

        Object id = me.get("id");
        Object emailClaim = me.get("email");
        if (id == null || emailClaim == null || emailClaim.toString().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Facebook account email is not verified");
        }
        String email = emailClaim.toString().toLowerCase().trim();
        String providerId = id.toString();

        User existing = users.findByEmail(email).orElse(null);
        if (existing != null) {
            if (!"facebook".equals(existing.getProvider())) {
                existing.setProvider("facebook");
                existing.setProviderId(providerId);
                users.save(existing);
            }
            return session(existing.getId(), existing.getEmail(), existing.getRole(),
                    nameOf(existing.getId()), UUID.randomUUID().toString());
        }

        Object nameClaim = me.get("name");
        String name = nameClaim != null && !nameClaim.toString().trim().isEmpty()
                ? nameClaim.toString().trim() : null;
        User user = new User();
        user.setEmail(email);
        user.setProvider("facebook");
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
        return session(user, row.getFamilyId());
    }

    @Transactional(readOnly = true)
    public AuthUserDto me(String userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
        return dtoFor(user);
    }

    /** Update own profile name + avatarUrl. Trimmed; blank → null (avatar removal,
     *  display-name cleared). Returns the refreshed auth user view. */
    @Transactional
    public AuthUserDto updateProfile(String userId, String name, String avatarUrl) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
        Profile profile = profiles.findByUserId(userId).orElseGet(() -> {
            Profile p = new Profile();
            p.setUserId(userId);
            return p;
        });
        profile.setName(blankToNull(name));
        profile.setAvatarUrl(blankToNull(avatarUrl));
        profiles.save(profile);
        return dtoFor(user);
    }

    /**
     * Set or change the local password (own endpoint).
     *
     * <p>If a local password already exists, {@code currentPassword} must match.
     * OAuth-only accounts (no passwordHash) may SET a password without one. The
     * new hash replaces the old. Every existing session is revoked and a fresh
     * one is minted for the acting device — so other devices are signed out while
     * the current device stays signed in (no forced re-login here), returned as a
     * new token pair. Min length is enforced by the DTO (8); recently-used-password
     * blocking is out of scope (phase 1).
     */
    @Transactional
    public AuthResponseDto changePassword(String userId, String currentPassword, String newPassword) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));

        if (user.getPasswordHash() != null) {
            if (currentPassword == null || currentPassword.isEmpty()
                    || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        users.save(user);

        // Revoke all existing families, then mint a fresh session for the acting
        // device (new family). Net effect: other devices signed out, this one kept.
        sessions.revokeAll(userId);
        return session(user, UUID.randomUUID().toString());
    }

    /** Sign out everywhere — revoke every refresh family for the user. The acting
     *  device's access token stays valid until expiry; the SPA discards it. */
    @Transactional
    public void logoutAll(String userId) {
        sessions.revokeAll(userId);
    }

    /**
     * Request a verified email change (own endpoint). Re-auths the acting user
     * (current password required for local accounts; OAuth-only re-auth via session),
     * rejects an already-taken address, issues a single active token (prior tokens
     * cleared), and mails the verification link to the NEW address. Returns the
     * refreshed auth view so the frontend renders the pending state immediately.
     */
    @Transactional
    public AuthUserDto requestEmailChange(String userId, String currentPassword, String newEmailIn) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));

        // Re-auth: local accounts must confirm the current password.
        if (user.getPasswordHash() != null) {
            if (currentPassword == null || currentPassword.isEmpty()
                    || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
            }
        }

        String newEmail = newEmailIn.toLowerCase().trim();
        if (newEmail.equals(user.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That is already your email");
        }
        if (users.existsByEmail(newEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // One active change per user — clear any prior tokens.
        emailChangeTokens.deleteByUserId(userId);

        EmailChangeToken token = new EmailChangeToken();
        token.setToken(UUID.randomUUID().toString());
        token.setUserId(userId);
        token.setNewEmail(newEmail);
        token.setUsed(false);
        token.setExpiresAt(Instant.now().plus(EMAIL_CHANGE_TTL));
        emailChangeTokens.save(token);

        String link = webUrl + "/#/account/verify-email?token="
                + URLEncoder.encode(token.getToken(), StandardCharsets.UTF_8);
        mail.sendEmailChangeVerification(newEmail, link);

        return dtoFor(user);
    }

    /**
     * Consume an email-change token (public endpoint — the token is the secret).
     * Swaps {@code User.email} to the verified new address, marks the token used,
     * and revokes every refresh family so all sessions must re-authenticate with
     * the new email. Rejects unknown/used/expired tokens, and a now-taken address.
     */
    @Transactional
    public void verifyEmailChange(String tokenValue) {
        EmailChangeToken token = emailChangeTokens.findById(tokenValue)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired link"));
        if (token.isUsed() || token.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired link");
        }

        User user = users.findById(token.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired link"));

        String newEmail = token.getNewEmail();
        // Re-check uniqueness at consume time (could have been taken since request).
        if (!newEmail.equals(user.getEmail()) && users.existsByEmail(newEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        user.setEmail(newEmail);
        users.save(user);

        token.setUsed(true);
        emailChangeTokens.save(token);

        // New email = new identity → force re-auth everywhere.
        sessions.revokeAll(user.getId());
    }

    /**
     * Permanently delete the acting account (own endpoint). Re-auths local
     * accounts via the current password; OAuth-only accounts delete via the
     * session alone. The user row is removed; DB-level FK cascades own its
     * children (profile, saved_places, refresh_tokens, email_change_tokens),
     * while submissions/reports keep their rows with user_id set null
     * (attribution survives). Irreversible.
     */
    @Transactional
    public void deleteAccount(String userId, String currentPassword) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));

        if (user.getPasswordHash() != null) {
            if (currentPassword == null || currentPassword.isEmpty()
                    || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
            }
        }

        // Revoke sessions first so a concurrent refresh can't outlive the delete,
        // then drop the user — DB cascades remove owned children.
        sessions.revokeAll(userId);
        users.deleteById(userId);
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** Build the public auth user view: identity + profile (name/avatar) + account state. */
    private AuthUserDto dtoFor(User user) {
        Profile profile = profiles.findByUserId(user.getId()).orElse(null);
        String name = profile != null ? profile.getName() : null;
        String avatarUrl = profile != null ? profile.getAvatarUrl() : null;

        // Derived email-change state from the latest active (unused) token.
        String pendingEmail = null;
        Instant pendingExpiresAt = null;
        String emailChangeStatus = "none";
        EmailChangeToken pending = emailChangeTokens
                .findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElse(null);
        if (pending != null) {
            pendingEmail = pending.getNewEmail();
            pendingExpiresAt = pending.getExpiresAt();
            emailChangeStatus = pending.getExpiresAt().isAfter(Instant.now()) ? "pending" : "expired";
        }

        return new AuthUserDto(
                user.getId(),
                user.getEmail(),
                name,
                user.getRole().name(),
                avatarUrl,
                user.getProvider(),
                user.getCreatedAt(),
                user.getPasswordHash() != null,
                pendingEmail,
                pendingExpiresAt,
                emailChangeStatus);
    }

    private AuthResponseDto session(User user, String familyId) {
        String access = jwt.createAccess(user.getId(), user.getEmail(), user.getRole().name());
        String jti = UUID.randomUUID().toString();
        JwtService.RefreshSigned refresh = jwt.createRefresh(user.getId(), jti, familyId);

        RefreshToken row = new RefreshToken();
        row.setJti(jti);
        row.setUserId(user.getId());
        row.setFamilyId(familyId);
        row.setUsed(false);
        row.setExpiresAt(refresh.expiresAt());
        refreshTokens.save(row);

        return new AuthResponseDto(dtoFor(user), access, refresh.token());
    }
}
