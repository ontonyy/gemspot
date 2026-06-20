package ee.gemspot.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/**
 * Stateless dual-token JWT (JJWT 0.12). Access {sub,email,role} signed with
 * JWT_SECRET (15m); refresh {sub,typ:"refresh",jti,fam} signed with
 * JWT_REFRESH_SECRET (30d). Env names mirror the Nest service exactly
 * (JWT_ACCESS_TTL / JWT_REFRESH_TTL / JWT_SECRET / JWT_REFRESH_SECRET).
 *
 * <p>HMAC keys are derived as SHA-256(secret) → a stable 256-bit key, so any
 * configured secret length works (JJWT rejects raw &lt;256-bit keys for HS256;
 * Nest's jsonwebtoken did not enforce this). Tokens are opaque to the SPA and
 * only this service verifies them, so the derivation is free to differ.
 */
@Service
public class JwtService {

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(
            @Value("${JWT_SECRET:gemspot-dev-access-secret}") String accessSecret,
            @Value("${JWT_REFRESH_SECRET:gemspot-dev-refresh-secret}") String refreshSecret,
            @Value("${JWT_ACCESS_TTL:15m}") String accessTtl,
            @Value("${JWT_REFRESH_TTL:30d}") String refreshTtl) {
        this.accessKey = deriveKey(accessSecret);
        this.refreshKey = deriveKey(refreshSecret);
        this.accessTtl = parseTtl(accessTtl);
        this.refreshTtl = parseTtl(refreshTtl);
    }

    /** Access token: claims {sub,email,role}. */
    public String createAccess(String userId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(accessKey)
                .compact();
    }

    /** Signed refresh token plus its jti/family/expiry (persisted for reuse detection). */
    public RefreshSigned createRefresh(String userId, String jti, String familyId) {
        Instant now = Instant.now();
        Instant exp = now.plus(refreshTtl);
        String token = Jwts.builder()
                .subject(userId)
                .claim("typ", "refresh")
                .claim("jti", jti)
                .claim("fam", familyId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(refreshKey)
                .compact();
        return new RefreshSigned(token, jti, familyId, exp);
    }

    public Claims parseAccess(String token) {
        return Jwts.parser().verifyWith(accessKey).build()
                .parseSignedClaims(token).getPayload();
    }

    public Claims parseRefresh(String token) {
        return Jwts.parser().verifyWith(refreshKey).build()
                .parseSignedClaims(token).getPayload();
    }

    public record RefreshSigned(String token, String jti, String familyId, Instant expiresAt) {}

    private static SecretKey deriveKey(String secret) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(hash, "HmacSHA256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** Parse "15m"/"30d"/"3600s"/"2h" — same suffix grammar as the Nest TTLs. */
    private static Duration parseTtl(String ttl) {
        String t = ttl.trim();
        char unit = t.charAt(t.length() - 1);
        long value = Long.parseLong(t.substring(0, t.length() - 1));
        return switch (unit) {
            case 's' -> Duration.ofSeconds(value);
            case 'm' -> Duration.ofMinutes(value);
            case 'h' -> Duration.ofHours(value);
            case 'd' -> Duration.ofDays(value);
            default -> throw new IllegalArgumentException("Unsupported TTL: " + ttl);
        };
    }
}
