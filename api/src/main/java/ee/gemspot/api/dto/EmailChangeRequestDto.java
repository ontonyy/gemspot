package ee.gemspot.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * POST /auth/email/change-request. Request a verified email change (own endpoint).
 * {@code currentPassword} is required only when a local password exists (re-auth,
 * enforced in the service); OAuth-only accounts re-auth via their session alone.
 * {@code newEmail} must be a valid, not-already-taken address.
 */
public record EmailChangeRequestDto(
        String currentPassword,
        @NotBlank @Email @Size(max = 320) String newEmail
) {}
