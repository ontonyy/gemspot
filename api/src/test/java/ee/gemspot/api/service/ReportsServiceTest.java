package ee.gemspot.api.service;

import ee.gemspot.api.domain.Report;
import ee.gemspot.api.domain.ReportReason;
import ee.gemspot.api.domain.ReportStatus;
import ee.gemspot.api.dto.ReportDto;
import ee.gemspot.api.repository.ReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** listMine: the user filter is the query, not a stream stage over every user's rows. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReportsServiceTest {

    @Mock ReportRepository reports;
    private ReportsService svc;

    @BeforeEach
    void setUp() {
        svc = new ReportsService(reports);
    }

    @Test
    void listMineAsksTheDatabaseForOnlyThatUsersRows() {
        Instant now = Instant.now();
        when(reports.findByUserIdOrderByReportedAtDesc("u1")).thenReturn(List.of(
                report("r2", "u1", now),                   // newest first, as the query orders them
                report("r1", "u1", now.minusSeconds(60))));

        List<ReportDto> res = svc.listMine("u1");

        assertThat(res).extracting(ReportDto::id).containsExactly("r2", "r1");
        assertThat(res.get(0).reason()).isEqualTo("closed"); // enum → frontend slug
        assertThat(res.get(0).status()).isEqualTo("OPEN");
        assertThat(res.get(0).placeSlug()).isEqualTo("a");
        verify(reports, times(0)).findAllByOrderByReportedAtDesc();
    }

    @Test
    void listMineIsEmptyWhenTheUserHasNoReports() {
        when(reports.findByUserIdOrderByReportedAtDesc("u2")).thenReturn(List.of());
        assertThat(svc.listMine("u2")).isEmpty();
    }

    private static Report report(String id, String userId, Instant at) {
        Report r = new Report();
        r.setId(id);
        r.setUserId(userId);
        r.setPlaceId("p1");
        r.setPlaceSlug("a");
        r.setPlaceName("A");
        r.setReason(ReportReason.CLOSED);
        r.setNote("n");
        r.setStatus(ReportStatus.OPEN);
        ReflectionTestUtils.setField(r, "reportedAt", at);
        return r;
    }
}
