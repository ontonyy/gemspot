package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PlaceRepository extends JpaRepository<Place, String> {
    List<Place> findAllByOrderBySortAsc();
    Optional<Place> findBySlug(String slug);
    List<Place> findByStatusOrderBySortAsc(PlaceStatus status);

    /** Fetch-join avoids one categories query per place on the public list path. */
    @Query("select distinct p from Place p left join fetch p.categories pc left join fetch pc.category where p.status = :status order by p.sort asc")
    List<Place> findActiveWithCategories(@Param("status") PlaceStatus status);
}
