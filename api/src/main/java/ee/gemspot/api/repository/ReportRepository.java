package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, String> {
    List<Report> findByStatusOrderByReportedAtDesc(ReportStatus status);
    List<Report> findAllByOrderByReportedAtDesc();
}
