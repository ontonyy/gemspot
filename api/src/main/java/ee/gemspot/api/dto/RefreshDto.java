package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshDto(@NotBlank String refreshToken) {}
