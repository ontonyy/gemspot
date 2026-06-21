package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** status: PENDING|APPROVED|REJECTED. submittedAt: relative string. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SubmissionDto(
        String name,
        String categoryId,
        double lat,
        double lng,
        String note,
        Integer photoCount,
        List<String> photoUrls,
        String id,
        String status,
        String submittedAt
) {}
