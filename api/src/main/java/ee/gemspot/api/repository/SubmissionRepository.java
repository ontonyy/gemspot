package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findByStatusOrderBySubmittedAtDesc(SubmissionStatus status);
    List<Submission> findAllByOrderBySubmittedAtDesc();
}
