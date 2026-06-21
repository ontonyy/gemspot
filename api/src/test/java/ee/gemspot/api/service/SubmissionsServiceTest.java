package ee.gemspot.api.service;

import ee.gemspot.api.domain.Submission;
import ee.gemspot.api.domain.SubmissionPhoto;
import ee.gemspot.api.domain.SubmissionStatus;
import ee.gemspot.api.dto.SubmissionDto;
import ee.gemspot.api.dto.SubmissionInputDto;
import ee.gemspot.api.repository.SubmissionPhotoRepository;
import ee.gemspot.api.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Port of {@code submissions.service.spec.ts}: create PENDING + photoCount derive + no-photo; listMine. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubmissionsServiceTest {

    @Mock SubmissionRepository submissions;
    @Mock SubmissionPhotoRepository submissionPhotos;
    private SubmissionsService svc;

    @BeforeEach
    void setUp() {
        svc = new SubmissionsService(submissions, submissionPhotos);
        // @CreationTimestamp is set by JPA on persist; emulate it on the mocked save.
        when(submissions.save(any(Submission.class))).thenAnswer(inv -> {
            Submission s = inv.getArgument(0);
            if (s.getId() == null) s.setId("s1");
            ReflectionTestUtils.setField(s, "submittedAt", Instant.now());
            return s;
        });
    }

    @Test
    void createsPendingSubmissionWithPhotos() {
        when(submissionPhotos.findBySubmissionIdOrderBySortAsc(any()))
                .thenReturn(List.of(photo("a.jpg", 0), photo("b.jpg", 1)));

        SubmissionDto dto = svc.create(new SubmissionInputDto(
                "New Court", "basketball", 59.4, 24.7, "nice", null,
                List.of("a.jpg", "b.jpg")), "u1");

        ArgumentCaptor<Submission> saved = ArgumentCaptor.forClass(Submission.class);
        verify(submissions).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo("u1");
        assertThat(saved.getValue().getStatus()).isEqualTo(SubmissionStatus.PENDING);
        assertThat(saved.getValue().getPhotoCount()).isEqualTo(2); // derived from photoUrls
        verify(submissionPhotos, times(2)).save(any(SubmissionPhoto.class));

        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(dto.photoUrls()).containsExactly("a.jpg", "b.jpg");
        assertThat(dto.submittedAt()).isEqualTo("just now");
    }

    @Test
    void handlesSubmissionWithNoPhotos() {
        when(submissionPhotos.findBySubmissionIdOrderBySortAsc(any())).thenReturn(List.of());

        SubmissionDto dto = svc.create(new SubmissionInputDto(
                "X", "scenic", 0, 0, "n", null, null), "u1");

        ArgumentCaptor<Submission> saved = ArgumentCaptor.forClass(Submission.class);
        verify(submissions).save(saved.capture());
        assertThat(saved.getValue().getPhotoCount()).isZero();
        verify(submissionPhotos, times(0)).save(any());
        assertThat(dto.photoUrls()).isEmpty();
    }

    @Test
    void listMineReturnsUserSubmissionsNewestFirst() {
        Submission row = new Submission();
        row.setId("s1");
        row.setUserId("u1");
        row.setName("A");
        row.setCategoryId("football");
        row.setNote("n");
        row.setStatus(SubmissionStatus.PENDING);
        ReflectionTestUtils.setField(row, "submittedAt", Instant.now());
        when(submissions.findAllByOrderBySubmittedAtDesc()).thenReturn(List.of(row));
        when(submissionPhotos.findBySubmissionIdOrderBySortAsc("s1")).thenReturn(List.of());

        List<SubmissionDto> res = svc.listMine("u1");
        assertThat(res).hasSize(1);
        assertThat(res.get(0).id()).isEqualTo("s1");
    }

    private static SubmissionPhoto photo(String url, int sort) {
        SubmissionPhoto p = new SubmissionPhoto();
        p.setUrl(url);
        p.setSort(sort);
        return p;
    }
}
