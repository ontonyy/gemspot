package ee.gemspot.api.integration;

import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.PlaceCategory;
import ee.gemspot.api.domain.PlaceStatus;
import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.Submission;
import ee.gemspot.api.domain.SubmissionPhoto;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.repository.CategoryRepository;
import ee.gemspot.api.repository.PlaceCategoryRepository;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.SubmissionPhotoRepository;
import ee.gemspot.api.repository.SubmissionRepository;
import ee.gemspot.api.repository.UserRepository;
import ee.gemspot.api.service.AdminService;
import ee.gemspot.api.service.PlacesService;
import ee.gemspot.api.service.SubmissionsService;
import jakarta.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Plan 002 regression: three list endpoints ran one query per row. These tests
 * assert the *shape* of the query plan rather than an absolute number — they
 * measure JDBC statements for a list call, add three more rows, and measure
 * again. An N+1 path grows with row count; a batched one does not. That makes
 * the assertions immune to seed-data changes and to how many statements the
 * batched form happens to need.
 *
 * Deliberately NOT {@code @Transactional}: one open session across the whole
 * test would cache entities and hide the per-row loads (the same trap
 * documented in AdminSubmissionsListRegressionTest). Fixtures are cleaned up
 * by hand instead, so the seed-count tests stay stable.
 */
class NPlusOneQueryCountTest extends AbstractIntegrationTest {

    private static final int EXTRA_ROWS = 3;
    private static final String TAG = "nplus1";

    @Autowired PlacesService placesService;
    @Autowired AdminService adminService;
    @Autowired SubmissionsService submissionsService;

    @Autowired PlaceRepository places;
    @Autowired PlaceCategoryRepository placeCategories;
    @Autowired CategoryRepository categories;
    @Autowired UserRepository users;
    @Autowired ProfileRepository profiles;
    @Autowired SubmissionRepository submissions;
    @Autowired SubmissionPhotoRepository submissionPhotos;
    @Autowired EntityManagerFactory emf;

    private final List<String> placeIds = new ArrayList<>();
    private final List<String> userIds = new ArrayList<>();
    private final List<String> submissionIds = new ArrayList<>();

    @AfterEach
    void cleanup() {
        submissionIds.forEach(id -> submissions.findById(id).ifPresent(s -> {
            submissionPhotos.findBySubmissionIdOrderBySortAsc(id).forEach(submissionPhotos::delete);
            submissions.delete(s);
        }));
        placeIds.forEach(id -> {
            placeCategories.findByPlaceId(id).forEach(placeCategories::delete);
            places.findById(id).ifPresent(places::delete);
        });
        userIds.forEach(id -> {
            profiles.findByUserId(id).ifPresent(profiles::delete);
            users.findById(id).ifPresent(users::delete);
        });
    }

    @Test
    void placeListDoesNotQueryCategoriesPerPlace() {
        long before = statementsFor(() -> placesService.list(null));
        int cardsBefore = placesService.list(null).size();

        for (int i = 0; i < EXTRA_ROWS; i++) {
            createActivePlace(i);
        }

        long after = statementsFor(() -> placesService.list(null));

        assertThat(placesService.list(null)).hasSize(cardsBefore + EXTRA_ROWS);
        assertThat(after)
                .as("JDBC statements for GET /places must not grow with place count")
                .isEqualTo(before);
    }

    @Test
    void adminUserListDoesNotQueryProfilePerUser() {
        long before = statementsFor(adminService::listUsers);
        int usersBefore = adminService.listUsers().size();

        for (int i = 0; i < EXTRA_ROWS; i++) {
            createUserWithProfile(i);
        }

        long after = statementsFor(adminService::listUsers);

        assertThat(adminService.listUsers()).hasSize(usersBefore + EXTRA_ROWS);
        assertThat(adminService.listUsers())
                .as("batched profile names still resolve")
                .anyMatch(u -> (TAG + "-name-0").equals(u.name()));
        assertThat(after)
                .as("JDBC statements for admin user list must not grow with user count")
                .isEqualTo(before);
    }

    @Test
    void mySubmissionsListDoesNotQueryPhotosPerSubmission() {
        String userId = createUserWithProfile(90);
        createSubmissionWithPhoto(userId, 0);

        long before = statementsFor(() -> submissionsService.listMine(userId));

        for (int i = 1; i <= EXTRA_ROWS; i++) {
            createSubmissionWithPhoto(userId, i);
        }

        long after = statementsFor(() -> submissionsService.listMine(userId));

        List<?> mine = submissionsService.listMine(userId);
        assertThat(mine).hasSize(EXTRA_ROWS + 1);
        assertThat(submissionsService.listMine(userId))
                .allSatisfy(dto -> assertThat(dto.photoUrls()).hasSize(1));
        assertThat(after)
                .as("JDBC statements for my-submissions must not grow with submission count")
                .isEqualTo(before);
    }

    @Test
    void adminStatsCountsInTheDatabaseInsteadOfLoadingRows() {
        long before = statementsFor(adminService::stats);

        for (int i = 0; i < EXTRA_ROWS; i++) {
            createActivePlace(i);
        }

        long after = statementsFor(adminService::stats);

        assertThat(before)
                .as("admin stats is five counts: places, active places, pending, open, users")
                .isEqualTo(5);
        assertThat(after)
                .as("JDBC statements for admin stats must not grow with row count")
                .isEqualTo(before);
    }

    /** JDBC statements prepared while {@code call} runs, measured on a clean session. */
    private long statementsFor(Runnable call) {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        call.run();
        return stats.getPrepareStatementCount();
    }

    private void createActivePlace(int i) {
        Place p = new Place();
        p.setId(TAG + "-place-" + i);
        p.setSlug(TAG + "-place-" + i);
        p.setName("N+1 fixture " + i);
        p.setNeighborhood("Testlinn");
        p.setLat(59.437);
        p.setLng(24.745);
        p.setFree(true);
        p.setTags(List.of(TAG));
        p.setNote("fixture");
        p.setContributorName("fixture");
        p.setAccessNote("a");
        p.setLitNote("l");
        p.setBestNote("b");
        p.setStatus(PlaceStatus.ACTIVE);
        p.setSort(900 + i);
        Place managed = places.save(p);
        placeIds.add(managed.getId());

        PlaceCategory link = new PlaceCategory();
        link.setPlace(managed);
        link.setCategory(categories.findById("basketball").orElseThrow());
        link.setPrimary(true);
        placeCategories.save(link);
    }

    private String createUserWithProfile(int i) {
        User u = new User();
        u.setEmail(TAG + "-user-" + i + "@gemspot.ee");
        u.setPasswordHash("x");
        User savedUser = users.save(u);
        userIds.add(savedUser.getId());

        Profile pr = new Profile();
        pr.setUserId(savedUser.getId());
        pr.setName(TAG + "-name-" + i);
        profiles.save(pr);
        return savedUser.getId();
    }

    private void createSubmissionWithPhoto(String userId, int i) {
        Submission s = new Submission();
        s.setUserId(userId);
        s.setName(TAG + "-submission-" + i);
        s.setCategoryId("basketball");
        s.setLat(59.437);
        s.setLng(24.745);
        s.setNote("fixture");
        Submission saved = submissions.save(s);
        submissionIds.add(saved.getId());

        SubmissionPhoto photo = new SubmissionPhoto();
        photo.setSubmission(saved);
        photo.setUrl("https://example.com/" + TAG + "-" + i + ".jpg");
        photo.setSort(0);
        submissionPhotos.save(photo);
    }
}
