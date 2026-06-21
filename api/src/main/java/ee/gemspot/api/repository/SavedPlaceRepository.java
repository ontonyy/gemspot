package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SavedPlaceRepository extends JpaRepository<SavedPlace, String> {
    List<SavedPlace> findByUserId(String userId);
    Optional<SavedPlace> findByUserIdAndPlaceId(String userId, String placeId);
    void deleteByUserIdAndPlaceId(String userId, String placeId);
    boolean existsByUserIdAndPlaceId(String userId, String placeId);
}
