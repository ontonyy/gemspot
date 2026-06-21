package ee.gemspot.api.domain;

import jakarta.persistence.*;

/** place_categories — join row. (placeId, categoryId) unique. `primary` is reserved → quoted. */
@Entity
@Table(name = "place_categories")
public class PlaceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "placeId", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoryId", nullable = false)
    private Category category;

    @Column(name = "`primary`", nullable = false)
    private boolean primary = false;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Place getPlace() { return place; }
    public void setPlace(Place place) { this.place = place; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }
}
