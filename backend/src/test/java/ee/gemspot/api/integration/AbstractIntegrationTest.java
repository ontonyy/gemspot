package ee.gemspot.api.integration;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * D6 Testcontainers base: one real Postgres for the whole integration suite.
 * Both the runtime datasource and the Liquibase connection point at the same
 * container (the pooler/:5432 split is a production-only concern). The shared
 * static container + identical property source lets Spring cache one context
 * across all integration classes, so Liquibase + the seed run exactly once.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start(); // singleton: started once, reused (never stopped → JVM exit cleans up)
    }

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        // Liquibase runs against the same container (direct connection in prod).
        registry.add("spring.liquibase.url", POSTGRES::getJdbcUrl);
        registry.add("spring.liquibase.user", POSTGRES::getUsername);
        registry.add("spring.liquibase.password", POSTGRES::getPassword);
    }
}
