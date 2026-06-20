package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, String> {
    List<Category> findAllByOrderBySortAsc();
    Optional<Category> findBySlug(String slug);
}
