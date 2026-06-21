package ee.gemspot.api.domain;

import jakarta.persistence.*;

/** categories — app-assigned String id (CategoryId taxonomy key), NO @GeneratedValue. */
@Entity
@Table(name = "categories")
public class Category {

    @Id
    private String id; // "tabletennis" | "basketball" | ...

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String label;

    @Column(name = "short", nullable = false)
    private String shortLabel;

    @Column(nullable = false)
    private String cssvar;

    @Column(nullable = false)
    private int sort = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getShortLabel() { return shortLabel; }
    public void setShortLabel(String shortLabel) { this.shortLabel = shortLabel; }

    public String getCssvar() { return cssvar; }
    public void setCssvar(String cssvar) { this.cssvar = cssvar; }

    public int getSort() { return sort; }
    public void setSort(int sort) { this.sort = sort; }
}
