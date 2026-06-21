package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Optional fields (distanceKm, thumbUrl, isSaved) omitted when null, like the mock. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlaceCardDto(
        String id,
        String slug,
        String name,
        CategoryDto category,
        String neighborhood,
        Double distanceKm,
        long savesCount,
        boolean isFree,
        String thumbUrl,
        List<String> tags,
        Boolean isSaved,
        double lat,
        double lng
) {}
