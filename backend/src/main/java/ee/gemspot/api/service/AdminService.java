package ee.gemspot.api.service;

import ee.gemspot.api.common.RelativeTime;
import ee.gemspot.api.domain.*;
import ee.gemspot.api.dto.*;
import ee.gemspot.api.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Byte-identical port of {@code admin.service.ts}.
 */
@Service
public class AdminService {

    private static final Map<ReportReason, String> REASON_TO_FRONT = new EnumMap<>(ReportReason.class);

    static {
        REASON_TO_FRONT.put(ReportReason.CLOSED, "closed");
        REASON_TO_FRONT.put(ReportReason.WRONG_LOCATION, "wrong-location");
        REASON_TO_FRONT.put(ReportReason.NOT_FREE, "not-free");
        REASON_TO_FRONT.put(ReportReason.OTHER, "other");
    }

    private final PlaceRepository placeRepo;
    private final SubmissionRepository submissionRepo;
    private final ReportRepository reportRepo;
    private final UserRepository userRepo;
    private final ProfileRepository profileRepo;
    private final PlaceCategoryRepository placeCategoryRepo;
    private final PlacePhotoRepository placePhotoRepo;
    private final CategoryRepository categoryRepo;

    public AdminService(
            PlaceRepository placeRepo,
            SubmissionRepository submissionRepo,
            ReportRepository reportRepo,
            UserRepository userRepo,
            ProfileRepository profileRepo,
            PlaceCategoryRepository placeCategoryRepo,
            PlacePhotoRepository placePhotoRepo,
            CategoryRepository categoryRepo) {
        this.placeRepo = placeRepo;
        this.submissionRepo = submissionRepo;
        this.reportRepo = reportRepo;
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.placeCategoryRepo = placeCategoryRepo;
        this.placePhotoRepo = placePhotoRepo;
        this.categoryRepo = categoryRepo;
    }

    /** Mirror of the JS slugify: lower → NFKD → [^a-z0-9]+→'-' → strip → slice(0,60) || 'spot'. */
    private static String slugify(String name) {
        String s = name.toLowerCase();
        s = Normalizer.normalize(s, Normalizer.Form.NFKD);
        s = s.replaceAll("[^a-z0-9]+", "-");
        s = s.replaceAll("^-+|-+$", "");
        if (s.length() > 60) {
            s = s.substring(0, 60);
        }
        return s.isEmpty() ? "spot" : s;
    }

    public AdminStatsDto stats() {
        long places = placeRepo.count();
        long activePlaces = placeRepo.findByStatusOrderBySortAsc(PlaceStatus.ACTIVE).size();
        long pendingSubmissions = submissionRepo.findByStatusOrderBySubmittedAtDesc(SubmissionStatus.PENDING).size();
        long openReports = reportRepo.findByStatusOrderByReportedAtDesc(ReportStatus.OPEN).size();
        long users = userRepo.count();
        return new AdminStatsDto(places, activePlaces, pendingSubmissions, openReports, users);
    }

    public List<AdminSubmissionDto> listSubmissions(String status) {
        List<Submission> rows = status != null
                ? submissionRepo.findByStatusOrderBySubmittedAtDesc(SubmissionStatus.valueOf(status))
                : submissionRepo.findAllByOrderBySubmittedAtDesc();
        List<AdminSubmissionDto> out = new ArrayList<>();
        for (Submission r : rows) {
            List<String> photoUrls = r.getPhotos().stream()
                    .sorted(Comparator.comparingInt(SubmissionPhoto::getSort))
                    .map(SubmissionPhoto::getUrl)
                    .toList();
            String submitterEmail = r.getUserId() == null
                    ? null
                    : userRepo.findById(r.getUserId()).map(User::getEmail).orElse(null);
            out.add(new AdminSubmissionDto(
                    r.getId(),
                    r.getName(),
                    r.getCategoryId(),
                    r.getLat(),
                    r.getLng(),
                    r.getNote(),
                    photoUrls,
                    r.getStatus().name(),
                    RelativeTime.relativeTime(r.getSubmittedAt()),
                    submitterEmail));
        }
        return out;
    }

    @Transactional
    public ApproveResultDto approveSubmission(String id) {
        Submission sub = submissionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "submission not found: " + id));

        // next zero-padded place id + sort (after the existing 01..10 set)
        List<Place> all = placeRepo.findAllByOrderBySortAsc();
        Place last = all.isEmpty() ? null : all.get(all.size() - 1);
        int nextSort = (last != null ? last.getSort() : -1) + 1;
        String nextId = String.format("%02d", nextSort + 1);

        // unique slug
        String slug = slugify(sub.getName());
        int n = 1;
        while (placeRepo.findBySlug(slug).isPresent()) {
            n += 1;
            slug = slugify(sub.getName()) + "-" + n;
        }

        Place place = new Place();
        place.setId(nextId);
        place.setSlug(slug);
        place.setName(sub.getName());
        place.setNeighborhood("Tallinn");
        place.setLat(sub.getLat());
        place.setLng(sub.getLng());
        place.setStatus(PlaceStatus.ACTIVE);
        place.setFree(true);
        place.setTags(List.of());
        place.setNote(sub.getNote());
        place.setContributorName("Community");
        place.setVerifiedLabel("just now");
        place.setAccessNote("Free");
        place.setLitNote("—");
        place.setBestNote("—");
        place.setSort(nextSort);
        // app-assigned @Id → save() merges; use the returned managed instance for FKs.
        place = placeRepo.save(place);

        PlaceCategory link = new PlaceCategory();
        link.setPlace(place);
        link.setCategory(categoryRepo.findById(sub.getCategoryId()).orElse(null));
        link.setPrimary(true);
        placeCategoryRepo.save(link);

        List<SubmissionPhoto> photos = sub.getPhotos().stream()
                .sorted(Comparator.comparingInt(SubmissionPhoto::getSort))
                .toList();
        for (int i = 0; i < photos.size(); i++) {
            PlacePhoto pp = new PlacePhoto();
            pp.setPlace(place);
            pp.setUrl(photos.get(i).getUrl());
            pp.setSort(i);
            placePhotoRepo.save(pp);
        }

        sub.setStatus(SubmissionStatus.APPROVED);
        submissionRepo.save(sub);

        return new ApproveResultDto(place.getId(), place.getSlug());
    }

    public RejectResultDto rejectSubmission(String id) {
        Submission sub = submissionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "submission not found: " + id));
        sub.setStatus(SubmissionStatus.REJECTED);
        submissionRepo.save(sub);
        return new RejectResultDto(id, "REJECTED");
    }

    public List<AdminPlaceDto> listPlaces() {
        List<Place> rows = placeRepo.findAllByOrderBySortAsc();
        List<AdminPlaceDto> out = new ArrayList<>();
        for (Place p : rows) {
            out.add(toAdminPlaceDto(p));
        }
        return out;
    }

    public AdminPlaceDto setPlaceStatus(String id, String status) {
        Place exists = placeRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "place not found: " + id));
        exists.setStatus(PlaceStatus.valueOf(status));
        placeRepo.save(exists);
        return toAdminPlaceDto(exists);
    }

    /** Mirror of the Prisma include { categories: { orderBy: { primary: 'desc' } } } → categories[0]. */
    private AdminPlaceDto toAdminPlaceDto(Place p) {
        String categoryId = p.getCategories().stream()
                .sorted(Comparator.comparing(PlaceCategory::isPrimary).reversed())
                .findFirst()
                .map(pc -> pc.getCategory().getId())
                .orElse("");
        return new AdminPlaceDto(
                p.getId(),
                p.getSlug(),
                p.getName(),
                p.getNeighborhood(),
                categoryId,
                p.getStatus().name(),
                p.isFree(),
                p.getSavesCount());
    }

    public List<AdminReportDto> listReports(String status) {
        List<Report> rows = status != null
                ? reportRepo.findByStatusOrderByReportedAtDesc(ReportStatus.valueOf(status))
                : reportRepo.findAllByOrderByReportedAtDesc();
        List<AdminReportDto> out = new ArrayList<>();
        for (Report r : rows) {
            out.add(toAdminReportDto(r));
        }
        return out;
    }

    public AdminReportDto setReportStatus(String id, String status) {
        Report exists = reportRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found: " + id));
        exists.setStatus(ReportStatus.valueOf(status));
        reportRepo.save(exists);
        return toAdminReportDto(exists);
    }

    private AdminReportDto toAdminReportDto(Report r) {
        String reporterEmail = r.getUserId() == null
                ? null
                : userRepo.findById(r.getUserId()).map(User::getEmail).orElse(null);
        return new AdminReportDto(
                r.getId(),
                r.getPlaceSlug(),
                r.getPlaceName(),
                REASON_TO_FRONT.get(r.getReason()),
                r.getNote(),
                r.getStatus().name(),
                RelativeTime.relativeTime(r.getReportedAt()),
                reporterEmail);
    }

    public List<AdminUserDto> listUsers() {
        List<User> rows = new ArrayList<>(userRepo.findAll());
        rows.sort(Comparator.comparing(User::getCreatedAt).reversed());
        List<AdminUserDto> out = new ArrayList<>();
        for (User u : rows) {
            String name = profileRepo.findByUserId(u.getId()).map(Profile::getName).orElse(null);
            out.add(new AdminUserDto(
                    u.getId(),
                    u.getEmail(),
                    name,
                    u.getRole().name(),
                    RelativeTime.relativeTime(u.getCreatedAt())));
        }
        return out;
    }
}
