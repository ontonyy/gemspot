package ee.gemspot.api.dto;

/**
 * DELETE /auth/me. Permanently delete the acting account (own endpoint).
 * {@code currentPassword} is required only when a local password exists
 * (re-auth, enforced in the service); OAuth-only accounts delete via session.
 */
public record DeleteAccountDto(
        String currentPassword
) {}
