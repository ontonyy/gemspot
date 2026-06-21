package ee.gemspot.api.dto;

import java.util.List;

/** submitterEmail nullable (serialized null). status: PENDING|APPROVED|REJECTED. */
public record AdminSubmissionDto(
        String id,
        String name,
        String categoryId,
        double lat,
        double lng,
        String note,
        List<String> photoUrls,
        String status,
        String submittedAt,
        String submitterEmail
) {}
