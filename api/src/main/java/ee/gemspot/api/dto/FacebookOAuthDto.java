package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;

public record FacebookOAuthDto(@NotBlank String accessToken) {}
