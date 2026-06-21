package ee.gemspot.api.service;

import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.SavedPlace;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.SavedPlaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Per-user saved places. Stores place ids; ignores unknown ids defensively so a
 * stale guest localStorage entry never fails the merge. Returns the id list in
 * stable place sort order so the Saved screen matches Explore ordering.
 *
 * <p>Byte-identical port of {@code saved.service.ts}.
 */
@Service
public class SavedService {

    private final SavedPlaceRepository savedPlaceRepository;
    private final PlaceRepository placeRepository;

    public SavedService(SavedPlaceRepository savedPlaceRepository, PlaceRepository placeRepository) {
        this.savedPlaceRepository = savedPlaceRepository;
        this.placeRepository = placeRepository;
    }

    public List<String> list(String userId) {
        List<SavedPlace> rows = savedPlaceRepository.findByUserId(userId);
        List<String> placeIds = rows.stream().map(SavedPlace::getPlaceId).collect(Collectors.toList());
        Map<String, Integer> sortById = new HashMap<>();
        for (Place place : placeRepository.findAllById(placeIds)) {
            sortById.put(place.getId(), place.getSort());
        }
        return rows.stream()
                .sorted(Comparator.comparingInt(r -> sortById.getOrDefault(r.getPlaceId(), 0)))
                .map(SavedPlace::getPlaceId)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<String> add(String userId, String placeId) {
        if (placeRepository.findById(placeId).isPresent()
                && !savedPlaceRepository.existsByUserIdAndPlaceId(userId, placeId)) {
            SavedPlace row = new SavedPlace();
            row.setUserId(userId);
            row.setPlaceId(placeId);
            savedPlaceRepository.save(row);
        }
        return list(userId);
    }

    @Transactional
    public List<String> remove(String userId, String placeId) {
        savedPlaceRepository.deleteByUserIdAndPlaceId(userId, placeId);
        return list(userId);
    }

    /**
     * Login-time merge: insert any guest ids the user doesn't already have, then
     * return the full server set. Unknown place ids are skipped (not an error).
     */
    @Transactional
    public List<String> merge(String userId, List<String> placeIds) {
        if (!placeIds.isEmpty()) {
            Set<String> valid = placeRepository.findAllById(placeIds).stream()
                    .map(Place::getId)
                    .collect(Collectors.toCollection(HashSet::new));
            for (String placeId : placeIds) {
                if (valid.contains(placeId) && !savedPlaceRepository.existsByUserIdAndPlaceId(userId, placeId)) {
                    SavedPlace row = new SavedPlace();
                    row.setUserId(userId);
                    row.setPlaceId(placeId);
                    savedPlaceRepository.save(row);
                }
            }
        }
        return list(userId);
    }
}
