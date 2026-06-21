package ee.gemspot.api.service;

import ee.gemspot.api.domain.Category;
import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.PlaceCategory;
import ee.gemspot.api.domain.PlaceStatus;
import ee.gemspot.api.domain.Report;
import ee.gemspot.api.domain.ReportReason;
import ee.gemspot.api.domain.ReportStatus;
import ee.gemspot.api.domain.Submission;
import ee.gemspot.api.domain.SubmissionPhoto;
import ee.gemspot.api.domain.SubmissionStatus;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.dto.AdminPlaceDto;
import ee.gemspot.api.dto.AdminReportDto;
import ee.gemspot.api.dto.AdminStatsDto;
import ee.gemspot.api.dto.ApproveResultDto;
import ee.gemspot.api.dto.RejectResultDto;
import ee.gemspot.api.repository.CategoryRepository;
import ee.gemspot.api.repository.PlaceCategoryRepository;
import ee.gemspot.api.repository.PlacePhotoRepository;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.ReportRepository;
import ee.gemspot.api.repository.SubmissionRepository;
import ee.gemspot.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.when;

/**
 * Port of {@code admin.service.spec.ts}: stats; approve 404/PENDING→ACTIVE
 * (padded id/sort/slug + APPROVED); slug disambiguation; reject; setPlaceStatus;
 * setReportStatus + enum→front map.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdminServiceTest {

    @Mock PlaceRepository placeRepo;
    @Mock SubmissionRepository submissionRepo;
    @Mock ReportRepository reportRepo;
    @Mock UserRepository userRepo;
    @Mock ProfileRepository profileRepo;
    @Mock PlaceCategoryRepository placeCategoryRepo;
    @Mock PlacePhotoRepository placePhotoRepo;
    @Mock CategoryRepository categoryRepo;
    private AdminService svc;

    @BeforeEach
    void setUp() {
        svc = new AdminService(placeRepo, submissionRepo, reportRepo, userRepo,
                profileRepo, placeCategoryRepo, placePhotoRepo, categoryRepo);
        // save() returns the managed instance the service now re-references (assigned @Id merge).
        when(placeRepo.save(org.mockito.ArgumentMatchers.any(Place.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void statsAggregatesDashboardCounters() {
        when(placeRepo.count()).thenReturn(12L);
        when(placeRepo.findByStatusOrderBySortAsc(PlaceStatus.ACTIVE)).thenReturn(nPlaces(10));
        when(submissionRepo.findByStatusOrderBySubmittedAtDesc(SubmissionStatus.PENDING)).thenReturn(nSubs(3));
        when(reportRepo.findByStatusOrderByReportedAtDesc(ReportStatus.OPEN)).thenReturn(nReports(1));
        when(userRepo.count()).thenReturn(5L);

        assertThat(svc.stats()).isEqualTo(new AdminStatsDto(12, 10, 3, 1, 5));
    }

    @Test
    void approveThrowsWhenSubmissionMissing() {
        when(submissionRepo.findById("nope")).thenReturn(Optional.empty());
        ResponseStatusException ex = catchThrowableOfType(
                () -> svc.approveSubmission("nope"), ResponseStatusException.class);
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void approvePublishesPendingAsActivePlaceAndMarksApproved() {
        Submission sub = submission("s1", "Secret Hoop", "basketball", List.of(photo("a.jpg", 0)));
        when(submissionRepo.findById("s1")).thenReturn(Optional.of(sub));
        when(placeRepo.findAllByOrderBySortAsc()).thenReturn(List.of(place("10", 9))); // last sort = 9
        when(placeRepo.findBySlug("secret-hoop")).thenReturn(Optional.empty());
        when(categoryRepo.findById("basketball")).thenReturn(Optional.of(category("basketball")));

        ApproveResultDto res = svc.approveSubmission("s1");

        ArgumentCaptor<Place> place = ArgumentCaptor.forClass(Place.class);
        org.mockito.Mockito.verify(placeRepo).save(place.capture());
        assertThat(place.getValue().getId()).isEqualTo("11"); // zero-padded after sort 9
        assertThat(place.getValue().getSort()).isEqualTo(10);
        assertThat(place.getValue().getStatus()).isEqualTo(PlaceStatus.ACTIVE);
        assertThat(place.getValue().getSlug()).isEqualTo("secret-hoop");

        ArgumentCaptor<PlaceCategory> link = ArgumentCaptor.forClass(PlaceCategory.class);
        org.mockito.Mockito.verify(placeCategoryRepo).save(link.capture());
        assertThat(link.getValue().isPrimary()).isTrue();
        assertThat(link.getValue().getCategory().getId()).isEqualTo("basketball");

        assertThat(sub.getStatus()).isEqualTo(SubmissionStatus.APPROVED);
        assertThat(res).isEqualTo(new ApproveResultDto("11", "secret-hoop"));
    }

    @Test
    void approveDisambiguatesTakenSlug() {
        Submission sub = submission("s1", "Park", "scenic", List.of());
        when(submissionRepo.findById("s1")).thenReturn(Optional.of(sub));
        when(placeRepo.findAllByOrderBySortAsc()).thenReturn(List.of()); // empty → sort 0, id "01"
        when(placeRepo.findBySlug("park")).thenReturn(Optional.of(place("01", 0))); // taken
        when(placeRepo.findBySlug("park-2")).thenReturn(Optional.empty());          // free
        when(categoryRepo.findById("scenic")).thenReturn(Optional.of(category("scenic")));

        ApproveResultDto res = svc.approveSubmission("s1");

        ArgumentCaptor<Place> place = ArgumentCaptor.forClass(Place.class);
        org.mockito.Mockito.verify(placeRepo).save(place.capture());
        assertThat(place.getValue().getSlug()).isEqualTo("park-2");
        assertThat(res.placeSlug()).isEqualTo("park-2");
    }

    @Test
    void rejectThrowsWhenMissing() {
        when(submissionRepo.findById("x")).thenReturn(Optional.empty());
        ResponseStatusException ex = catchThrowableOfType(
                () -> svc.rejectSubmission("x"), ResponseStatusException.class);
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void rejectFlipsSubmissionToRejected() {
        Submission sub = submission("s1", "X", "scenic", List.of());
        when(submissionRepo.findById("s1")).thenReturn(Optional.of(sub));
        RejectResultDto res = svc.rejectSubmission("s1");
        assertThat(sub.getStatus()).isEqualTo(SubmissionStatus.REJECTED);
        assertThat(res).isEqualTo(new RejectResultDto("s1", "REJECTED"));
    }

    @Test
    void setPlaceStatusThrowsWhenMissing() {
        when(placeRepo.findById("x")).thenReturn(Optional.empty());
        ResponseStatusException ex = catchThrowableOfType(
                () -> svc.setPlaceStatus("x", "INACTIVE"), ResponseStatusException.class);
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void setPlaceStatusUpdatesAndReturnsView() {
        Place p = place("01", 0);
        p.setSlug("a");
        p.setName("A");
        p.setNeighborhood("Tallinn");
        p.getCategories().add(primaryLink(p, "scenic"));
        when(placeRepo.findById("01")).thenReturn(Optional.of(p));

        AdminPlaceDto res = svc.setPlaceStatus("01", "INACTIVE");
        assertThat(p.getStatus()).isEqualTo(PlaceStatus.INACTIVE);
        assertThat(res.status()).isEqualTo("INACTIVE");
        assertThat(res.categoryId()).isEqualTo("scenic");
    }

    @Test
    void setReportStatusThrowsWhenMissing() {
        when(reportRepo.findById("x")).thenReturn(Optional.empty());
        ResponseStatusException ex = catchThrowableOfType(
                () -> svc.setReportStatus("x", "RESOLVED"), ResponseStatusException.class);
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void setReportStatusFlipsAndMapsEnumToFrontSlug() {
        Report r = new Report();
        r.setId("r1");
        r.setPlaceSlug("a");
        r.setPlaceName("A");
        r.setReason(ReportReason.CLOSED);
        r.setUserId("ru");
        ReflectionTestUtils.setField(r, "reportedAt", Instant.now());
        when(reportRepo.findById("r1")).thenReturn(Optional.of(r));
        when(userRepo.findById("ru")).thenReturn(Optional.of(userEmail("r@e.com")));

        AdminReportDto res = svc.setReportStatus("r1", "RESOLVED");
        assertThat(res.status()).isEqualTo("RESOLVED");
        assertThat(res.reason()).isEqualTo("closed"); // enum → frontend slug
        assertThat(res.reporterEmail()).isEqualTo("r@e.com");
    }

    // --- builders ---

    private static Place place(String id, int sort) {
        Place p = new Place();
        p.setId(id);
        p.setSort(sort);
        return p;
    }

    private static PlaceCategory primaryLink(Place p, String categoryId) {
        PlaceCategory pc = new PlaceCategory();
        pc.setPlace(p);
        pc.setCategory(category(categoryId));
        pc.setPrimary(true);
        return pc;
    }

    private static Category category(String id) {
        Category c = new Category();
        c.setId(id);
        return c;
    }

    private static Submission submission(String id, String name, String categoryId, List<SubmissionPhoto> photos) {
        Submission s = new Submission();
        s.setId(id);
        s.setName(name);
        s.setCategoryId(categoryId);
        s.setLat(59.4);
        s.setLng(24.7);
        s.setNote("n");
        s.getPhotos().addAll(photos);
        return s;
    }

    private static SubmissionPhoto photo(String url, int sort) {
        SubmissionPhoto p = new SubmissionPhoto();
        p.setUrl(url);
        p.setSort(sort);
        return p;
    }

    private static User userEmail(String email) {
        User u = new User();
        u.setEmail(email);
        return u;
    }

    private static List<Place> nPlaces(int n) {
        return java.util.stream.IntStream.range(0, n).mapToObj(i -> place("p" + i, i)).toList();
    }

    private static List<Submission> nSubs(int n) {
        return java.util.stream.IntStream.range(0, n)
                .mapToObj(i -> submission("s" + i, "n", "scenic", List.of())).toList();
    }

    private static List<Report> nReports(int n) {
        return java.util.stream.IntStream.range(0, n).mapToObj(i -> {
            Report r = new Report();
            r.setId("r" + i);
            return r;
        }).toList();
    }
}
