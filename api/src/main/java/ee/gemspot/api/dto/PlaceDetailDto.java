package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** PlaceCard fields + detail. verifiedAt omitted when absent (unverified). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlaceDetailDto(
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
        double lng,
        String note,
        List<PhotoDto> photos,
        long viewsCount,
        long sharesCount,
        ContributorDto contributor,
        String verifiedAt,
        FieldNotesDto fieldNotes,
        String appleMapsUrl,
        String googleMapsUrl
) {}
