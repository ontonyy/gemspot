package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;

/**
 * POST /auth/password. Set or change the local password (own endpoint).
 * {@code currentPassword} is required only when a local password already
 * exists (enforced in the service); OAuth-only accounts set without it.
 * newPassword min 8 (strength rule documented in service).
 */
public record ChangePasswordDto(
        String currentPassword,
        @NotBlank @Size(min = 8, max = 200) String newPassword
) {
    @AssertTrue(message = "newPassword must be at most 72 UTF-8 bytes")
    public boolean isNewPasswordWithinBcryptByteLimit() {
        return newPassword == null || newPassword.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
