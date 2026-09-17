package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record SetReportStatusDto(@NotNull @Pattern(regexp = "OPEN|RESOLVED|DISMISSED") String status) {}
