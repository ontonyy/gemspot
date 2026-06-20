package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlaceCategoryRepository extends JpaRepository<PlaceCategory, String> {
    List<PlaceCategory> findByPlaceId(String placeId);
}
