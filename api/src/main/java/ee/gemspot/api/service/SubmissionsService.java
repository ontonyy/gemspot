package ee.gemspot.api.service;

import ee.gemspot.api.common.RelativeTime;
import ee.gemspot.api.domain.Submission;
import ee.gemspot.api.domain.SubmissionPhoto;
import ee.gemspot.api.domain.SubmissionStatus;
import ee.gemspot.api.dto.SubmissionDto;
import ee.gemspot.api.dto.SubmissionInputDto;
import ee.gemspot.api.repository.SubmissionPhotoRepository;
import ee.gemspot.api.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * User-submitted places (PENDING until an admin acts) and the per-user list
 * the SPA renders. Server-backed so submissions survive reload.
 *
 * <p>Byte-identical port of {@code submissions.service.ts}.
 */
@Service
public class SubmissionsService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionPhotoRepository submissionPhotoRepository;

    public SubmissionsService(SubmissionRepository submissionRepository,
                              SubmissionPhotoRepository submissionPhotoRepository) {
        this.submissionRepository = submissionRepository;
        this.submissionPhotoRepository = submissionPhotoRepository;
    }

    @Transactional
    public SubmissionDto create(SubmissionInputDto input, String userId) {
        List<String> urls = input.photoUrls() != null ? input.photoUrls() : List.of();
        Submission row = new Submission();
        row.setUserId(userId);
        row.setName(input.name());
        row.setCategoryId(input.categoryId());
        row.setLat(input.lat());
        row.setLng(input.lng());
        row.setNote(input.note());
        row.setPhotoCount(input.photoCount() != null ? input.photoCount() : urls.size());
        row.setStatus(SubmissionStatus.PENDING);
        Submission saved = submissionRepository.save(row);
        for (int sort = 0; sort < urls.size(); sort++) {
            SubmissionPhoto photo = new SubmissionPhoto();
            photo.setSubmission(saved);
            photo.setUrl(urls.get(sort));
            photo.setSort(sort);
            submissionPhotoRepository.save(photo);
        }
        return toDto(saved);
    }

    /** PENDING submissions for the signed-in user — survives reload (server-backed). */
    public List<SubmissionDto> listMine(String userId) {
        return submissionRepository.findAllByOrderBySubmittedAtDesc().stream()
                .filter(r -> userId.equals(r.getUserId()))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private SubmissionDto toDto(Submission row) {
        List<String> photoUrls = submissionPhotoRepository
                .findBySubmissionIdOrderBySortAsc(row.getId()).stream()
                .map(SubmissionPhoto::getUrl)
                .collect(Collectors.toList());
        return new SubmissionDto(
                row.getName(),
                row.getCategoryId(),
                row.getLat(),
                row.getLng(),
                row.getNote(),
                row.getPhotoCount(),
                photoUrls,
                row.getId(),
                row.getStatus().name(),
                RelativeTime.relativeTime(row.getSubmittedAt())
        );
    }
}
