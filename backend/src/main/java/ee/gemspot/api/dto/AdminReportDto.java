package ee.gemspot.api.dto;

/** note + reporterEmail nullable (serialized null). status: OPEN|RESOLVED|DISMISSED. */
public record AdminReportDto(
        String id,
        String placeSlug,
        String placeName,
        String reason,
        String note,
        String status,
        String reportedAt,
        String reporterEmail
) {}
