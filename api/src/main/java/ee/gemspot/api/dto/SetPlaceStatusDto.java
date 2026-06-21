package ee.gemspot.api.dto;

import jakarta.validation.constraints.Pattern;

public record SetPlaceStatusDto(@Pattern(regexp = "ACTIVE|INACTIVE|DRAFT") String status) {}
