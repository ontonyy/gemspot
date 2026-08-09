package ee.gemspot.api.integration;

import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.Submission;
import ee.gemspot.api.domain.SubmissionPhoto;
import ee.gemspot.api.domain.SubmissionStatus;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.domain.UserRole;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.SubmissionPhotoRepository;
import ee.gemspot.api.repository.SubmissionRepository;
import ee.gemspot.api.repository.UserRepository;
import ee.gemspot.api.service.AdminService;
import ee.gemspot.api.service.PlacesService;
import ee.gemspot.api.service.SubmissionsService;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Plan 002 Step 4: the real N+1 proof. The service tests assert Mockito call
 * counts; this one counts JDBC statements Hibernate actually prepares, so a
 * regression to per-row loading fails here even if the repository API stays
 * the same.
 *
 * <p>Statistics are enabled via {@link TestPropertySource} only — the shared
 * test config is untouched. Deliberately NOT {@code @Transactional}: each
 * service call must open and close its own session, the way a request does.
 *
 * <p>Every endpoint is measured at two dataset sizes. Equal counts prove the
 * work does not scale with rows; the absolute ceilings are the counts observed
 * when the batching landed.
 */
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class QueryCountRegressionTest extends AbstractIntegrationTest {

    private static final String EMAIL_PREFIX = "querycount-";

    /** One fetch-join for the places + their categories. */
    private static final int PLACES_LIST_MAX_QUERIES = 1;
    /** One user select + one batched profile select. */
    private static final int ADMIN_LIST_USERS_MAX_QUERIES = 2;
    /** One submission select + one batched photo select. */
    private static final int LIST_MINE_MAX_QUERIES = 2;

    @Autowired EntityManagerFactory emf;
    @Autowired PlacesService places;
    @Autowired AdminService admin;
    @Autowired SubmissionsService submissions;
    @Autowired UserRepository userRepo;
    @Autowired ProfileRepository profileRepo;
    @Autowired SubmissionRepository submissionRepo;
    @Autowired SubmissionPhotoRepository photoRepo;

    private final List<String> createdUserIds = new ArrayList<>();
    private final List<String> createdSubmissionIds = new ArrayList<>();

    private Statistics stats;

    @BeforeEach
    void statistics() {
        stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
    }

    @AfterEach
    void cleanup() {
        createdSubmissionIds.forEach(id -> submissionRepo.findById(id).ifPresent(submissionRepo::delete));
        createdUserIds.forEach(id -> {
            profileRepo.findByUserId(id).ifPresent(profileRepo::delete);
            userRepo.findById(id).ifPresent(userRepo::delete);
        });
        createdSubmissionIds.clear();
        createdUserIds.clear();
    }

    private long countQueries(Runnable call) {
        stats.clear();
        call.run();
        return stats.getPrepareStatementCount();
    }

    private User newUser(String tag, boolean withProfile) {
        User u = new User();
        u.setEmail(EMAIL_PREFIX + tag + "@gemspot.ee");
        u.setPasswordHash("x");
        u.setRole(UserRole.CLIENT);
        User saved = userRepo.save(u);
        createdUserIds.add(saved.getId());
        if (withProfile) {
            Profile p = new Profile();
            p.setUserId(saved.getId());
            p.setName("QC " + tag);
            profileRepo.save(p);
        }
        return saved;
    }

    private void newSubmission(String userId, String tag, int photoCount) {
        Submission s = new Submission();
        s.setUserId(userId);
        s.setName("QC spot " + tag);
        s.setCategoryId("basketball");
        s.setLat(59.44);
        s.setLng(24.75);
        s.setNote("query count");
        s.setPhotoCount(photoCount);
        s.setStatus(SubmissionStatus.PENDING);
        Submission saved = submissionRepo.save(s);
        createdSubmissionIds.add(saved.getId());
        for (int sort = 0; sort < photoCount; sort++) {
            SubmissionPhoto photo = new SubmissionPhoto();
            photo.setSubmission(saved);
            photo.setUrl("https://example.com/" + tag + "-" + sort + ".jpg");
            photo.setSort(sort);
            photoRepo.save(photo);
        }
    }

    @Test
    void placesListDoesNotQueryPerPlace() {
        long queries = countQueries(() -> {
            List<?> cards = places.list(null);
            assertThat(cards).isNotEmpty(); // seeded ACTIVE places
        });

        assertThat(queries).isEqualTo(PLACES_LIST_MAX_QUERIES);
    }

    @Test
    void adminListUsersDoesNotQueryPerUser() {
        newUser("a", true);
        newUser("b", true);
        newUser("c", false);
        long small = countQueries(admin::listUsers);

        newUser("d", true);
        newUser("e", true);
        newUser("f", true);
        long large = countQueries(admin::listUsers);

        assertThat(large).isEqualTo(small);
        assertThat(large).isEqualTo(ADMIN_LIST_USERS_MAX_QUERIES);
    }

    @Test
    void listMineDoesNotQueryPerSubmission() {
        User owner = newUser("subs", false);
        newSubmission(owner.getId(), "s1", 2);
        newSubmission(owner.getId(), "s2", 3);
        long small = countQueries(() -> {
            List<?> mine = submissions.listMine(owner.getId());
            assertThat(mine).hasSize(2);
        });

        newSubmission(owner.getId(), "s3", 2);
        newSubmission(owner.getId(), "s4", 4);
        long large = countQueries(() -> {
            List<?> mine = submissions.listMine(owner.getId());
            assertThat(mine).hasSize(4);
        });

        assertThat(large).isEqualTo(small);
        assertThat(large).isEqualTo(LIST_MINE_MAX_QUERIES);
    }
}
