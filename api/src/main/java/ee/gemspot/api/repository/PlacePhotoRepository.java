package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlacePhotoRepository extends JpaRepository<PlacePhoto, String> {
    List<PlacePhoto> findByPlaceIdOrderBySortAsc(String placeId);
}
