package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotBlank;

public record SavePlaceDto(@NotBlank String placeId) {}
