package ee.gemspot.api.service;

import ee.gemspot.api.domain.Category;
import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.PlaceCategory;
import ee.gemspot.api.domain.PlaceStatus;
import ee.gemspot.api.dto.PlaceCardDto;
import ee.gemspot.api.mapper.PlaceMapper;
import ee.gemspot.api.repository.PlaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Guards the batched category fetch on the public list path (plan 002 step 1). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PlacesServiceTest {

    @Mock PlaceRepository placeRepo;
    private PlacesService svc;

    @BeforeEach
    void setUp() {
        svc = new PlacesService(placeRepo, new PlaceMapper());
    }

    @Test
    void listMapsAllPlacesPreservingRepositoryOrder() {
        when(placeRepo.findActiveWithCategories(PlaceStatus.ACTIVE)).thenReturn(List.of(
                place("01", "alpha", "basketball"),
                place("02", "bravo", "tabletennis"),
                place("03", "charlie", "basketball")));

        List<PlaceCardDto> cards = svc.list(null);

        assertThat(cards).extracting(PlaceCardDto::slug).containsExactly("alpha", "bravo", "charlie");
        assertThat(cards).extracting(c -> c.category().id())
                .containsExactly("basketball", "tabletennis", "basketball");
    }

    @Test
    void listFiltersByCategory() {
        when(placeRepo.findActiveWithCategories(PlaceStatus.ACTIVE)).thenReturn(List.of(
                place("01", "alpha", "basketball"),
                place("02", "bravo", "tabletennis"),
                place("03", "charlie", "basketball")));

        List<PlaceCardDto> cards = svc.list("basketball");

        assertThat(cards).extracting(PlaceCardDto::slug).containsExactly("alpha", "charlie");
    }

    /** N+1 regression: exactly one batched query, never the lazy per-place path. */
    @Test
    void listIssuesASingleBatchedQuery() {
        when(placeRepo.findActiveWithCategories(PlaceStatus.ACTIVE)).thenReturn(List.of(
                place("01", "alpha", "basketball"),
                place("02", "bravo", "tabletennis"),
                place("03", "charlie", "basketball")));

        svc.list(null);

        verify(placeRepo, times(1)).findActiveWithCategories(PlaceStatus.ACTIVE);
        verify(placeRepo, never()).findByStatusOrderBySortAsc(any());
    }

    private static Place place(String id, String slug, String categoryId) {
        Place p = new Place();
        p.setId(id);
        p.setSlug(slug);
        p.setName("Place " + slug);
        p.setNeighborhood("Kesklinn");
        p.setLat(59.4);
        p.setLng(24.7);
        p.setStatus(PlaceStatus.ACTIVE);
        p.setTags(List.of("outdoor"));

        Category c = new Category();
        c.setId(categoryId);
        c.setSlug(categoryId);
        c.setLabel(categoryId);
        c.setShortLabel(categoryId);
        c.setCssvar("--cat-" + categoryId);

        PlaceCategory pc = new PlaceCategory();
        pc.setPlace(p);
        pc.setCategory(c);
        pc.setPrimary(true);
        p.getCategories().add(pc);

        return p;
    }
}
