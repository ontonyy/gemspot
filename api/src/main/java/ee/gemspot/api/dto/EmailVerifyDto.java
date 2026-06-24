package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * POST /auth/email/verify. Consume an email-change token (public endpoint — the
 * token is the bearer of authority, clicked from the verification email which may
 * land on a different device/session).
 */
public record EmailVerifyDto(
        @NotBlank String token
) {}
