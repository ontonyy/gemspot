package ee.gemspot.api.service;

import ee.gemspot.api.domain.Category;
import ee.gemspot.api.domain.Place;
import ee.gemspot.api.dto.GuideDetailDto;
import ee.gemspot.api.dto.GuideDto;
import ee.gemspot.api.dto.PlaceCardDto;
import ee.gemspot.api.mapper.PlaceMapper;
import ee.gemspot.api.repository.CategoryRepository;
import ee.gemspot.api.repository.PlaceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Mirrors buildGuides() in the mock: one guide per category with >=2 spots,
 * plus a "Free to play" cross-cut prepended. Derived from the place set.
 */
@Service
@Transactional(readOnly = true)
public class GuidesService {

    private static final String FREE_GUIDE_ID = "free-to-play";

    private final PlaceRepository placeRepository;
    private final CategoryRepository categoryRepository;
    private final PlaceMapper mapper;

    public GuidesService(PlaceRepository placeRepository,
                         CategoryRepository categoryRepository,
                         PlaceMapper mapper) {
        this.placeRepository = placeRepository;
        this.categoryRepository = categoryRepository;
        this.mapper = mapper;
    }

    private String catId(Place p) {
        return mapper.primaryCategory(p).getId();
    }

    /** Build result mirroring Nest's { guides, places } so getById does not re-query. */
    private record Built(List<GuideDto> guides, List<Place> places) {}

    private Built build() {
        List<Category> cats = categoryRepository.findAllByOrderBySortAsc();
        List<Place> places = placeRepository.findAllByOrderBySortAsc();

        List<GuideDto> byCat = new ArrayList<>();
        for (Category c : cats) {
            List<String> slugs = places.stream()
                    .filter(p -> catId(p).equals(c.getId()))
                    .map(Place::getSlug)
                    .toList();
            GuideDto guide = new GuideDto(
                    "cat-" + c.getId(),
                    c.getLabel(),
                    "Every " + c.getShortLabel().toLowerCase() + " spot in the field guide",
                    c.getId(),
                    null,
                    slugs.size(),
                    slugs
            );
            if (guide.count() >= 2) byCat.add(guide);
        }

        List<String> freeSlugs = places.stream()
                .filter(Place::isFree)
                .map(Place::getSlug)
                .toList();
        GuideDto free = new GuideDto(
                FREE_GUIDE_ID,
                "Free to play",
                "No booking, no fee — just show up",
                "scenic",
                null,
                freeSlugs.size(),
                freeSlugs
        );

        List<GuideDto> guides = new ArrayList<>();
        guides.add(free);
        guides.addAll(byCat);
        return new Built(guides, places);
    }

    public List<GuideDto> list() {
        return build().guides();
    }

    public GuideDetailDto getById(String id) {
        Built built = build();
        GuideDto guide = built.guides().stream()
                .filter(g -> g.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "guide not found: " + id));

        Map<String, Place> bySlug = new LinkedHashMap<>();
        for (Place p : built.places()) bySlug.put(p.getSlug(), p);

        List<PlaceCardDto> spots = guide.spotSlugs().stream()
                .map(bySlug::get)
                .filter(p -> p != null)
                .map(mapper::toCard)
                .toList();

        return new GuideDetailDto(guide, spots);
    }
}
