package ee.gemspot.api.service;

import ee.gemspot.api.common.RelativeTime;
import ee.gemspot.api.domain.Report;
import ee.gemspot.api.domain.ReportReason;
import ee.gemspot.api.domain.ReportStatus;
import ee.gemspot.api.dto.ReportDto;
import ee.gemspot.api.dto.ReportInputDto;
import ee.gemspot.api.repository.ReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * User reports about places (OPEN until an admin resolves) and the per-user
 * list the SPA renders. Server-backed so reports survive reload.
 *
 * <p>Byte-identical port of {@code reports.service.ts}.
 */
@Service
public class ReportsService {

    private static final Map<String, ReportReason> REASON_TO_DB = Map.of(
            "closed", ReportReason.CLOSED,
            "wrong-location", ReportReason.WRONG_LOCATION,
            "not-free", ReportReason.NOT_FREE,
            "other", ReportReason.OTHER
    );

    private static final Map<ReportReason, String> REASON_FROM_DB = Map.of(
            ReportReason.CLOSED, "closed",
            ReportReason.WRONG_LOCATION, "wrong-location",
            ReportReason.NOT_FREE, "not-free",
            ReportReason.OTHER, "other"
    );

    private final ReportRepository reportRepository;

    public ReportsService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @Transactional
    public ReportDto create(ReportInputDto input, String userId) {
        Report row = new Report();
        row.setUserId(userId);
        row.setPlaceId(input.placeId());
        row.setPlaceSlug(input.placeSlug());
        row.setPlaceName(input.placeName());
        row.setReason(REASON_TO_DB.get(input.reason()));
        row.setNote(input.note());
        row.setStatus(ReportStatus.OPEN);
        Report saved = reportRepository.save(row);
        return new ReportDto(
                input.placeId(),
                input.placeSlug(),
                input.placeName(),
                input.reason(),
                input.note(),
                saved.getId(),
                "OPEN",
                "just now"
        );
    }

    /** OPEN reports for the signed-in user — survives reload (server-backed). */
    public List<ReportDto> listMine(String userId) {
        return reportRepository.findAllByOrderByReportedAtDesc().stream()
                .filter(r -> userId.equals(r.getUserId()))
                .map(r -> new ReportDto(
                        r.getPlaceId() != null ? r.getPlaceId() : "",
                        r.getPlaceSlug(),
                        r.getPlaceName(),
                        REASON_FROM_DB.get(r.getReason()),
                        r.getNote(),
                        r.getId(),
                        r.getStatus().name(),
                        RelativeTime.relativeTime(r.getReportedAt())
                ))
                .collect(Collectors.toList());
    }
}
