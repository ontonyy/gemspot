package ee.gemspot.api.service;

import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.SavedPlace;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.SavedPlaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Port of {@code saved.service.spec.ts}: list order; add; merge; remove. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SavedServiceTest {

    @Mock SavedPlaceRepository savedPlaces;
    @Mock PlaceRepository places;
    private SavedService svc;

    @BeforeEach
    void setUp() {
        svc = new SavedService(savedPlaces, places);
    }

    @Test
    void listReturnsIdsInPlaceSortOrder() {
        when(savedPlaces.findByUserId("u1")).thenReturn(List.of(
                saved("03"), saved("01"), saved("02")));
        when(places.findAllById(anyList())).thenReturn(List.of(
                place("03", 2), place("01", 0), place("02", 1)));
        assertThat(svc.list("u1")).containsExactly("01", "02", "03");
    }

    @Test
    void addUpsertsKnownPlaceThenReturnsList() {
        when(places.findById("01")).thenReturn(Optional.of(place("01", 0)));
        when(savedPlaces.existsByUserIdAndPlaceId("u1", "01")).thenReturn(false);
        when(savedPlaces.findByUserId("u1")).thenReturn(List.of(saved("01")));
        when(places.findAllById(anyList())).thenReturn(List.of(place("01", 0)));

        assertThat(svc.add("u1", "01")).containsExactly("01");
        verify(savedPlaces).save(any(SavedPlace.class));
    }

    @Test
    void addIgnoresUnknownPlaceId() {
        when(places.findById("ZZ")).thenReturn(Optional.empty());
        when(savedPlaces.findByUserId("u1")).thenReturn(List.of());

        assertThat(svc.add("u1", "ZZ")).isEmpty();
        verify(savedPlaces, never()).save(any());
    }

    @Test
    void mergeInsertsValidIdsSkipsUnknownAndDuplicates() {
        when(places.findAllById(List.of("01", "02", "GHOST")))
                .thenReturn(List.of(place("01", 0), place("02", 1)));
        when(savedPlaces.existsByUserIdAndPlaceId("u1", "01")).thenReturn(false);
        when(savedPlaces.existsByUserIdAndPlaceId("u1", "02")).thenReturn(true); // dupe → skip
        when(savedPlaces.findByUserId("u1")).thenReturn(List.of(saved("01"), saved("02")));
        when(places.findAllById(List.of("01", "02"))).thenReturn(List.of(place("01", 0), place("02", 1)));

        assertThat(svc.merge("u1", List.of("01", "02", "GHOST"))).containsExactly("01", "02");
        verify(savedPlaces, times(1)).save(any(SavedPlace.class)); // only 01 inserted
    }

    @Test
    void mergeNoOpsOnEmptyGuestSet() {
        when(savedPlaces.findByUserId("u1")).thenReturn(List.of());
        assertThat(svc.merge("u1", List.of())).isEmpty();
        verify(savedPlaces, never()).save(any());
    }

    @Test
    void removeDeletesPairThenReturnsRemaining() {
        when(savedPlaces.findByUserId("u1")).thenReturn(List.of());
        assertThat(svc.remove("u1", "01")).isEmpty();
        verify(savedPlaces).deleteByUserIdAndPlaceId("u1", "01");
    }

    private static SavedPlace saved(String placeId) {
        SavedPlace s = new SavedPlace();
        s.setUserId("u1");
        s.setPlaceId(placeId);
        return s;
    }

    private static Place place(String id, int sort) {
        Place p = new Place();
        p.setId(id);
        p.setSort(sort);
        return p;
    }
}
