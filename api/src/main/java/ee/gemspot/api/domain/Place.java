package ee.gemspot.api.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** places — app-assigned String id ("01".."10"), NO @GeneratedValue. tags = text[]. */
@Entity
@Table(name = "places")
public class Place {

    @Id
    private String id; // zero-padded "01".."10"

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String neighborhood;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "\"PlaceStatus\"")
    private PlaceStatus status = PlaceStatus.ACTIVE;

    @Column(nullable = false)
    private int savesCount = 0;

    @Column(nullable = false)
    private int viewsCount = 0;

    @Column(nullable = false)
    private int sharesCount = 0;

    @Column(nullable = false)
    private boolean isFree = true;

    private String thumbUrl;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private List<String> tags = new ArrayList<>();

    @Column(nullable = false)
    private String note;

    @Column(nullable = false)
    private String contributorName;

    // Nullable: live contract carries verifiedAt as an ISO timestamp; 8 places
    // seeded, Löwenruh + Pirita left UNSET → mapper passes null → verifiedAt omitted.
    private String verifiedLabel;

    @Column(nullable = false)
    private String accessNote;

    @Column(nullable = false)
    private String litNote;

    @Column(nullable = false)
    private String bestNote;

    @Column(nullable = false)
    private int sort = 0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "place", fetch = FetchType.LAZY)
    private List<PlaceCategory> categories = new ArrayList<>();

    @OneToMany(mappedBy = "place", fetch = FetchType.LAZY)
    private List<PlacePhoto> photos = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNeighborhood() { return neighborhood; }
    public void setNeighborhood(String neighborhood) { this.neighborhood = neighborhood; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public PlaceStatus getStatus() { return status; }
    public void setStatus(PlaceStatus status) { this.status = status; }

    public int getSavesCount() { return savesCount; }
    public void setSavesCount(int savesCount) { this.savesCount = savesCount; }

    public int getViewsCount() { return viewsCount; }
    public void setViewsCount(int viewsCount) { this.viewsCount = viewsCount; }

    public int getSharesCount() { return sharesCount; }
    public void setSharesCount(int sharesCount) { this.sharesCount = sharesCount; }

    public boolean isFree() { return isFree; }
    public void setFree(boolean free) { isFree = free; }

    public String getThumbUrl() { return thumbUrl; }
    public void setThumbUrl(String thumbUrl) { this.thumbUrl = thumbUrl; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getContributorName() { return contributorName; }
    public void setContributorName(String contributorName) { this.contributorName = contributorName; }

    public String getVerifiedLabel() { return verifiedLabel; }
    public void setVerifiedLabel(String verifiedLabel) { this.verifiedLabel = verifiedLabel; }

    public String getAccessNote() { return accessNote; }
    public void setAccessNote(String accessNote) { this.accessNote = accessNote; }

    public String getLitNote() { return litNote; }
    public void setLitNote(String litNote) { this.litNote = litNote; }

    public String getBestNote() { return bestNote; }
    public void setBestNote(String bestNote) { this.bestNote = bestNote; }

    public int getSort() { return sort; }
    public void setSort(int sort) { this.sort = sort; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<PlaceCategory> getCategories() { return categories; }
    public List<PlacePhoto> getPhotos() { return photos; }
}
