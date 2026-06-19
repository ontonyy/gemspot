package ee.gemspot.api.integration;

import ee.gemspot.api.repository.CategoryRepository;
import ee.gemspot.api.repository.PlaceRepository;
import ee.gemspot.api.repository.UserRepository;
import ee.gemspot.api.seed.DataSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 1. Liquibase changelog applies + Hibernate ddl-auto=validate passes — if the
 *    mapping drifts (text[]/jsonb/enum/@Id) the context fails to start and this
 *    test fails. 2. The seed is idempotent: re-running it leaves row counts stable.
 */
class SchemaAndSeedIntegrationTest extends AbstractIntegrationTest {

    @Autowired DataSeeder seeder;
    @Autowired CategoryRepository categories;
    @Autowired PlaceRepository places;
    @Autowired UserRepository users;

    @Test
    void schemaValidatesAndSeedIsIdempotent() {
        // Seed already ran once on boot (ApplicationRunner).
        assertThat(categories.count()).isEqualTo(7);
        assertThat(places.count()).isEqualTo(10);
        assertThat(users.count()).isEqualTo(1); // admin only

        // Run again → same counts (idempotent).
        seeder.run(null);
        assertThat(categories.count()).isEqualTo(7);
        assertThat(places.count()).isEqualTo(10);
        assertThat(users.count()).isEqualTo(1);
    }
}
