package ee.gemspot.api.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Plan 031: proves {@link ee.gemspot.api.common.RateLimitFilter} is WIRED, not merely that a
 * counter counts. Every case drives a real endpoint through the real servlet filter chain.
 *
 * <p>Limits are lowered here rather than exercised at their production defaults, so the test
 * states its own threshold and cannot silently pass (or explode) when the defaults move. The
 * window is long enough that the assertions cannot roll over mid-test.
 *
 * <p>Login bodies are deliberately a nonexistent address: the request is rejected before any
 * bcrypt verify, so the loop stays cheap and writes no state.
 */
@TestPropertySource(properties = {
        "app.rate-limit.window-seconds=300",
        "app.rate-limit.auth-per-window=3",
        "app.rate-limit.events-per-window=3"
})
class RateLimitTest extends AbstractIntegrationTest {

    private static final int LIMIT = 3;
    private static final String BAD_LOGIN = "{\"email\":\"nobody-031@gemspot.test\",\"password\":\"wrongpassword\"}";

    @Autowired MockMvc mvc;

    private MvcResult login(String clientIp) throws Exception {
        return mvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BAD_LOGIN))
                .andReturn();
    }

    @Test
    void authLimitTripsWith429AndRetryAfter() throws Exception {
        String client = "203.0.113.10";

        for (int i = 0; i < LIMIT; i++) {
            assertThat(login(client).getResponse().getStatus())
                    .as("request %d of %d must be served, not throttled", i + 1, LIMIT)
                    .isNotEqualTo(429);
        }

        MvcResult blocked = mvc.perform(post("/auth/login")
                        .header("X-Forwarded-For", client)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BAD_LOGIN))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.statusCode").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andReturn();

        String retryAfter = blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER);
        assertThat(retryAfter).as("Retry-After must be present on a 429").isNotNull();
        assertThat(Integer.parseInt(retryAfter))
                .as("Retry-After is whole seconds until the window rolls")
                .isPositive();
    }

    @Test
    void differentClientIsUnaffected() throws Exception {
        String noisy = "203.0.113.20";
        for (int i = 0; i <= LIMIT; i++) {
            login(noisy);
        }
        assertThat(login(noisy).getResponse().getStatus())
                .as("the noisy client is throttled")
                .isEqualTo(429);

        assertThat(login("203.0.113.21").getResponse().getStatus())
                .as("a different client keeps its own budget")
                .isNotEqualTo(429);
    }

    @Test
    void unlimitedPathNotAffectedByAuthBucket() throws Exception {
        String client = "203.0.113.30";
        for (int i = 0; i <= LIMIT; i++) {
            login(client);
        }
        assertThat(login(client).getResponse().getStatus()).isEqualTo(429);

        mvc.perform(get("/health").header("X-Forwarded-For", client))
                .andExpect(status().isOk());
    }

    @Test
    void eventsIngressIsLimitedSeparatelyFromAuth() throws Exception {
        String client = "203.0.113.40";
        String body = "{\"name\":\"plan031_probe\"}";

        for (int i = 0; i < LIMIT; i++) {
            mvc.perform(post("/events")
                            .header("X-Forwarded-For", client)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isAccepted());
        }
        mvc.perform(post("/events")
                        .header("X-Forwarded-For", client)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER));
    }
}
