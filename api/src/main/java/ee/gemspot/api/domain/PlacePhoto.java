package ee.gemspot.api.domain;

import jakarta.persistence.*;

/** place_photos — FK → places ON DELETE CASCADE. */
@Entity
@Table(name = "place_photos")
public class PlacePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "placeId", nullable = false)
    private Place place;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private int sort = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Place getPlace() { return place; }
    public void setPlace(Place place) { this.place = place; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public int getSort() { return sort; }
    public void setSort(int sort) { this.sort = sort; }
}
