package ee.gemspot.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /auth/register. password 8..72 (bcrypt input ceiling); name optional ≤60. */
public record RegisterDto(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 60) String name
) {}
