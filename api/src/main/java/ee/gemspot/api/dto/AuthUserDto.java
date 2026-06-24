package ee.gemspot.api.dto;

import java.time.Instant;

/**
 * name/avatarUrl/provider are nullable and serialized as null (not omitted). role: CLIENT|ADMIN.
 * hasPassword = local password set (passwordHash != null); false for OAuth-only accounts.
 *
 * <p>Email-change derived state (formalized, not guessed by the frontend):
 * {@code pendingEmail} = the requested new address while a change is unverified
 * (null when none), {@code pendingExpiresAt} = its expiry, {@code emailChangeStatus}
 * = {@code none | pending | expired}.
 */
public record AuthUserDto(
        String id,
        String email,
        String name,
        String role,
        String avatarUrl,
        String provider,
        Instant createdAt,
        boolean hasPassword,
        String pendingEmail,
        Instant pendingExpiresAt,
        String emailChangeStatus) {}
