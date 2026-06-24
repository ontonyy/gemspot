package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * POST /auth/password. Set or change the local password (own endpoint).
 * {@code currentPassword} is required only when a local password already
 * exists (enforced in the service); OAuth-only accounts set without it.
 * newPassword min 8 (strength rule documented in service).
 */
public record ChangePasswordDto(
        String currentPassword,
        @NotBlank @Size(min = 8, max = 200) String newPassword
) {}
