package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlaceRepository extends JpaRepository<Place, String> {
    List<Place> findAllByOrderBySortAsc();
    Optional<Place> findBySlug(String slug);
    List<Place> findByStatusOrderBySortAsc(PlaceStatus status);
}
