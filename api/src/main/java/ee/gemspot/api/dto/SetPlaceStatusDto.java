package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record SetPlaceStatusDto(@NotNull @Pattern(regexp = "ACTIVE|INACTIVE|DRAFT") String status) {}
