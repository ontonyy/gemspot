package ee.gemspot.api.dto;

/** status: ACTIVE|INACTIVE|DRAFT. */
public record AdminPlaceDto(
        String id,
        String slug,
        String name,
        String neighborhood,
        String categoryId,
        String status,
        boolean isFree,
        long savesCount
) {}
