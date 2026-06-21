package ee.gemspot.api.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/** reports — userId + placeId nullable (FK ON DELETE SET NULL). Slug/name denormalized. */
@Entity
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String userId;  // nullable
    private String placeId; // nullable

    @Column(nullable = false)
    private String placeSlug;

    @Column(nullable = false)
    private String placeName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "\"ReportReason\"")
    private ReportReason reason;

    private String note; // nullable

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "\"ReportStatus\"")
    private ReportStatus status = ReportStatus.OPEN;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant reportedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }

    public String getPlaceSlug() { return placeSlug; }
    public void setPlaceSlug(String placeSlug) { this.placeSlug = placeSlug; }

    public String getPlaceName() { return placeName; }
    public void setPlaceName(String placeName) { this.placeName = placeName; }

    public ReportReason getReason() { return reason; }
    public void setReason(ReportReason reason) { this.reason = reason; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public ReportStatus getStatus() { return status; }
    public void setStatus(ReportStatus status) { this.status = status; }

    public Instant getReportedAt() { return reportedAt; }
}
