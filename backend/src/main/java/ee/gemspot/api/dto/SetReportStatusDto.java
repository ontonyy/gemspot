package ee.gemspot.api.dto;

import jakarta.validation.constraints.Pattern;

public record SetReportStatusDto(@Pattern(regexp = "OPEN|RESOLVED|DISMISSED") String status) {}
