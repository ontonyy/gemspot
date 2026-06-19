package ee.gemspot.api.domain;

import jakarta.persistence.*;

/** submission_photos — FK → submissions ON DELETE CASCADE. */
@Entity
@Table(name = "submission_photos")
public class SubmissionPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submissionId", nullable = false)
    private Submission submission;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private int sort = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Submission getSubmission() { return submission; }
    public void setSubmission(Submission submission) { this.submission = submission; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public int getSort() { return sort; }
    public void setSort(int sort) { this.sort = sort; }
}
