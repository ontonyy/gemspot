package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleOAuthDto(@NotBlank String idToken) {}
