package ee.gemspot.api.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** submissions — userId nullable (FK ON DELETE SET NULL). */
@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String userId; // nullable

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String categoryId;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    @Column(nullable = false)
    private String note;

    @Column(nullable = false)
    private int photoCount = 0;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "\"SubmissionStatus\"")
    private SubmissionStatus status = SubmissionStatus.PENDING;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant submittedAt;

    @OneToMany(mappedBy = "submission", fetch = FetchType.LAZY)
    private List<SubmissionPhoto> photos = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public int getPhotoCount() { return photoCount; }
    public void setPhotoCount(int photoCount) { this.photoCount = photoCount; }

    public SubmissionStatus getStatus() { return status; }
    public void setStatus(SubmissionStatus status) { this.status = status; }

    public Instant getSubmittedAt() { return submittedAt; }

    public List<SubmissionPhoto> getPhotos() { return photos; }
}
