package ee.gemspot.api.mapper;

import ee.gemspot.api.domain.Category;
import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.PlaceCategory;
import ee.gemspot.api.dto.CategoryDto;
import ee.gemspot.api.dto.ContributorDto;
import ee.gemspot.api.dto.FieldNotesDto;
import ee.gemspot.api.dto.PhotoDto;
import ee.gemspot.api.dto.PlaceCardDto;
import ee.gemspot.api.dto.PlaceDetailDto;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Pure mappers: JPA entities -> frontend DTOs. Logic mirrors the Nest
 * toCategoryDto / toCard / toDetail (backend/src/application/places/place.mapper.ts)
 * so the HTTP responses are byte-identical to the mock + Nest backend.
 */
@Component
public class PlaceMapper {

    public CategoryDto toCategoryDto(Category c) {
        return new CategoryDto(
                c.getId(),
                c.getLabel(),
                c.getShortLabel(),
                c.getCssvar(),
                c.getId()
        );
    }

    public Category primaryCategory(Place p) {
        return p.getCategories().stream()
                .filter(PlaceCategory::isPrimary)
                .findFirst()
                .orElse(p.getCategories().get(0))
                .getCategory();
    }

    public PlaceCardDto toCard(Place p) {
        return new PlaceCardDto(
                p.getId(),
                p.getSlug(),
                p.getName(),
                toCategoryDto(primaryCategory(p)),
                p.getNeighborhood(),
                null,                   // distanceKm — omitted via NON_NULL
                p.getSavesCount(),
                p.isFree(),
                null,                   // thumbUrl — omitted via NON_NULL
                p.getTags(),
                null,                   // isSaved — omitted via NON_NULL
                p.getLat(),
                p.getLng()
        );
    }

    public PlaceDetailDto toDetail(Place p) {
        // q mirrors Nest `${p.lat},${p.lng}` (JS number->string == JDK shortest-repr Double.toString).
        String q = doubleToJs(p.getLat()) + "," + doubleToJs(p.getLng());

        List<PhotoDto> photos = p.getPhotos().stream()
                .sorted(Comparator.comparingInt(ph -> ph.getSort()))
                .map(ph -> new PhotoDto(ph.getUrl()))
                .collect(Collectors.toList());
        if (photos.isEmpty()) {
            photos = List.of(new PhotoDto("")); // {url:""} placeholder, matches Nest
        }

        return new PlaceDetailDto(
                p.getId(),
                p.getSlug(),
                p.getName(),
                toCategoryDto(primaryCategory(p)),
                p.getNeighborhood(),
                null,                   // distanceKm
                p.getSavesCount(),
                p.isFree(),
                null,                   // thumbUrl
                p.getTags(),
                null,                   // isSaved
                p.getLat(),
                p.getLng(),
                p.getNote(),
                photos,
                p.getViewsCount(),
                p.getSharesCount(),
                new ContributorDto(p.getContributorName()),
                p.getVerifiedLabel(),
                new FieldNotesDto(p.getAccessNote(), p.getLitNote(), p.getBestNote()),
                "https://maps.apple.com/?ll=" + q + "&q=" + encodeURIComponent(p.getName()),
                // googleMapsUrl query is raw (NOT url-encoded) in Nest — keep raw.
                "https://www.google.com/maps/search/?api=1&query=" + q
        );
    }

    /** Matches JS Number->String shortest round-trip (JDK 19+ Double.toString). */
    private static String doubleToJs(double d) {
        return Double.toString(d);
    }

    /** Matches JS encodeURIComponent: space -> %20 (URLEncoder emits + ; fix it). */
    private static String encodeURIComponent(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
