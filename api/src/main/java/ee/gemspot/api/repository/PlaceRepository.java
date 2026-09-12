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

    /**
     * Same rows as {@link #findByStatusOrderBySortAsc}, but with categories and
     * their Category preloaded, so PlaceMapper.toCard() adds no per-place query.
     * {@code distinct} guards against row duplication from the collection join.
     * Only one collection is joined (photos stay lazy — toCard never reads them),
     * so there is no cartesian blow-up. Do NOT add pagination to this query:
     * Hibernate would paginate a join-fetch in memory.
     */
    @Query("select distinct p from Place p "
            + "left join fetch p.categories pc "
            + "left join fetch pc.category "
            + "where p.status = :status order by p.sort asc")
    List<Place> findByStatusWithCategories(@Param("status") PlaceStatus status);
}
