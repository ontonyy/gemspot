package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** status fixed OPEN. reportedAt: relative string. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportDto(
        String placeId,
        String placeSlug,
        String placeName,
        String reason,
        String note,
        String id,
        String status,
        String reportedAt
) {}
