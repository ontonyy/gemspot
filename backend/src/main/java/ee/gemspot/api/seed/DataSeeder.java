package ee.gemspot.api.seed;

import ee.gemspot.api.domain.Category;
import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.PlaceCategory;
import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.domain.UserRole;
import ee.gemspot.api.repository.CategoryRepository;
import ee.gemspot.api.repository.PlaceCategoryRepository;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Idempotent seed — port of {@code prisma/seed.ts}. Upserts the 7 categories,
 * 10 places (exact RAW: slugs/coords/tags/notes/field-note cells) and the admin
 * user from {@code ADMIN_EMAIL}/{@code ADMIN_PASSWORD}. Safe to run on every boot.
 *
 * <p>verifiedLabel carries the live contract's {@code verifiedAt} ISO timestamp
 * (matching {@code web/src/shared/api/placesApi.ts} RAW): 8 places verified,
 * Löwenruh pitch (06) + Pirita padel (08) left UNSET so the mapper omits
 * verifiedAt and the SPA renders the hidden-badge fallback. The mapper passes
 * the value straight through.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    // id, label, short, cssvar — sort = array order (mirrors seed.ts CATS).
    private static final String[][] CATS = {
            {"tabletennis", "Table tennis", "Ping pong", "--c-tabletennis"},
            {"basketball", "Basketball", "Hoops", "--c-basketball"},
            {"football", "Football", "Football", "--c-football"},
            {"tennis", "Tennis", "Tennis", "--c-tennis"},
            {"padel", "Padel", "Padel", "--c-padel"},
            {"scenic", "Viewpoint", "Views", "--c-scenic"},
            {"sakura", "Sakura", "Sakura", "--c-sakura"},
    };

    private record Raw(String id, String slug, String name, String cat, String area,
                       double lat, double lng, int saves, int views, int shares,
                       List<String> tags, String note, String by, String verified,
                       boolean isFree, String access, String lit, String best) {}

    // verified = ISO 8601 (live contract) or null for the 2 unset demos (06, 08).
    private static final List<Raw> RAW = List.of(
            new Raw("01", "politseiaia-ping-pong", "Politseiaia ping-pong", "tabletennis", "Kesklinn", 59.4351, 24.7475, 38, 412, 9, List.of("Free", "Concrete", "Lit"), "Two weather-worn outdoor tables tucked behind the police garden. Quiet on weekday mornings, busy after 18:00 when the after-work crowd rolls in.", "maris_t", "2026-05-27T09:00:00Z", true, "Free", "Yes", "Eve"),
            new Raw("02", "kanuti-aed-blossoms", "Kanuti aed blossoms", "sakura", "Kesklinn", 59.4405, 24.7495, 96, 1203, 41, List.of("Seasonal", "Late Apr"), "A short row of cherry trees along the old bastion wall. Peak bloom lasts roughly ten days; go early to beat the photographers.", "tallinn_walks", "2026-06-04T09:00:00Z", true, "Free", "No", "Apr"),
            new Raw("03", "patkuli-viewpoint", "Patkuli viewpoint", "scenic", "Toompea", 59.4395, 24.7385, 142, 2890, 88, List.of("Free", "Sunset", "Rooftops"), "The classic red-roof panorama over the lower town and harbour. North-facing, so best at golden hour rather than true sunset.", "gemspot_team", "2026-06-06T09:00:00Z", true, "Free", "No", "Dusk"),
            new Raw("04", "politseipark-hoops", "Politseipark hoops", "basketball", "Kesklinn", 59.4330, 24.7480, 21, 198, 4, List.of("Free", "Full court"), "Single full court with fresh nets as of this spring. Surface drains well, so it dries fast after rain.", "hoops_ee", "2026-05-30T09:00:00Z", true, "Free", "Yes", "Day"),
            new Raw("05", "kadrioru-tennis-courts", "Kadrioru tennis courts", "tennis", "Kadriorg", 59.4380, 24.7905, 44, 530, 12, List.of("Hard court", "Lit"), "Public hard courts beside the park. First-come on weekdays; bring your own net tension tolerance and a spare ball.", "noor.k", "2026-06-02T09:00:00Z", false, "Paid", "Yes", "Day"),
            new Raw("06", "lowenruh-pitch", "Löwenruh pitch", "football", "Kristiine", 59.4270, 24.7180, 34, 305, 7, List.of("Free", "Grass"), "Full-size grass pitch beside the park pond. Open for pickup games when the clubs are not training.", "fc_local", null, true, "Free", "No", "Eve"),
            new Raw("07", "snelli-pond-tables", "Snelli pond tables", "tabletennis", "Kesklinn", 59.4375, 24.7430, 52, 644, 15, List.of("Free", "Shaded"), "Three tables under the trees by Snelli pond. Shaded all afternoon, which makes it the summer favourite.", "maris_t", "2026-06-05T09:00:00Z", true, "Free", "No", "Day"),
            new Raw("08", "pirita-padel-club", "Pirita padel club", "padel", "Pirita", 59.4690, 24.8330, 27, 281, 6, List.of("Booking", "Indoor"), "Four indoor padel courts out by the marina. Book ahead on weekends; off-peak weekday slots are easy to grab.", "fc_local", null, false, "Booking", "Yes", "Eve"),
            new Raw("09", "lasnamae-cliff-view", "Lasnamäe cliff view", "scenic", "Lasnamäe", 59.4360, 24.8400, 67, 910, 22, List.of("Free", "Industrial"), "Limestone escarpment looking back at the city skyline. Raw, a little industrial, and almost always empty.", "noor.k", "2026-05-28T09:00:00Z", true, "Free", "No", "Dusk"),
            new Raw("10", "tammsaare-cherries", "Tammsaare cherries", "sakura", "Kesklinn", 59.4330, 24.7530, 113, 1740, 53, List.of("Seasonal", "Late Apr", "Central"), "The most photographed blossoms in town, ringing the park fountain. Crowded at peak, but worth one early visit.", "tallinn_walks", "2026-06-03T09:00:00Z", true, "Free", "No", "Apr")
    );

    private final CategoryRepository categories;
    private final PlaceRepository places;
    private final PlaceCategoryRepository placeCategories;
    private final UserRepository users;
    private final ProfileRepository profiles;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(CategoryRepository categories,
                      PlaceRepository places,
                      PlaceCategoryRepository placeCategories,
                      UserRepository users,
                      ProfileRepository profiles,
                      PasswordEncoder passwordEncoder) {
        this.categories = categories;
        this.places = places;
        this.placeCategories = placeCategories;
        this.users = users;
        this.profiles = profiles;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedCategories();
        seedPlaces();
        seedAdmin();
    }

    // Upsert categories: update mutable fields if present, else create. Order = sort.
    private void seedCategories() {
        for (int i = 0; i < CATS.length; i++) {
            String[] c = CATS[i];
            Category cat = categories.findById(c[0]).orElseGet(Category::new);
            cat.setId(c[0]);
            cat.setSlug(c[0]);
            cat.setLabel(c[1]);
            cat.setShortLabel(c[2]);
            cat.setCssvar(c[3]);
            cat.setSort(i);
            categories.save(cat);
        }
    }

    // Create-if-absent (mirrors Nest seed `update: {}`): existing places untouched.
    private void seedPlaces() {
        for (int i = 0; i < RAW.size(); i++) {
            Raw r = RAW.get(i);
            if (places.existsById(r.id())) {
                continue;
            }
            Place p = new Place();
            p.setId(r.id());
            p.setSlug(r.slug());
            p.setName(r.name());
            p.setNeighborhood(r.area());
            p.setLat(r.lat());
            p.setLng(r.lng());
            p.setSavesCount(r.saves());
            p.setViewsCount(r.views());
            p.setSharesCount(r.shares());
            p.setFree(r.isFree());
            p.setTags(r.tags());
            p.setNote(r.note());
            p.setContributorName(r.by());
            p.setVerifiedLabel(r.verified()); // null for 06/08 → verifiedAt omitted
            p.setAccessNote(r.access());
            p.setLitNote(r.lit());
            p.setBestNote(r.best());
            p.setSort(i);
            // Place has an app-assigned @Id → save() merges and returns the managed
            // instance; the FK link must reference THAT, not the detached original.
            Place managed = places.save(p);

            PlaceCategory link = new PlaceCategory();
            link.setPlace(managed);
            link.setCategory(categories.findById(r.cat()).orElseThrow());
            link.setPrimary(true);
            placeCategories.save(link);
        }
    }

    // Upsert admin: existing → ensure ADMIN role; absent → create with hashed password + profile.
    private void seedAdmin() {
        String email = envOr("ADMIN_EMAIL", "admin@gemspot.ee").toLowerCase();
        String password = envOr("ADMIN_PASSWORD", "admin1234");
        User existing = users.findByEmail(email).orElse(null);
        if (existing != null) {
            existing.setRole(UserRole.ADMIN);
            users.save(existing);
            return;
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(UserRole.ADMIN);
        user = users.save(user);

        Profile profile = new Profile();
        profile.setUserId(user.getId());
        profile.setName("GemSpot Admin");
        profiles.save(profile);
    }

    private static String envOr(String key, String fallback) {
        String v = System.getenv(key);
        return v != null && !v.isEmpty() ? v : fallback;
    }
}
