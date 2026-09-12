package ee.gemspot.api.repository;

import ee.gemspot.api.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SubmissionPhotoRepository extends JpaRepository<SubmissionPhoto, String> {
    List<SubmissionPhoto> findBySubmissionIdOrderBySortAsc(String submissionId);

    /**
     * Urls for many submissions in one round trip. Returns a projection rather
     * than entities on purpose: {@code SubmissionPhoto.submission} is a lazy
     * @ManyToOne, so grouping entities by {@code getSubmission().getId()} would
     * initialise one proxy per photo and just move the N+1. {@code p.submission.id}
     * reads the FK column, adding no join.
     */
    @Query("select p.submission.id as submissionId, p.url as url from SubmissionPhoto p "
            + "where p.submission.id in :ids order by p.sort asc")
    List<SubmissionPhotoUrl> findUrlsBySubmissionIds(@Param("ids") Collection<String> ids);

    interface SubmissionPhotoUrl {
        String getSubmissionId();
        String getUrl();
    }
}
