package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ee.gemspot.api.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression: a login-issued refresh token must rotate at POST /auth/refresh.
 *
 * <p>The defect: {@code AuthService.login()} was {@code @Transactional(readOnly
 * = true)}, so the {@code refreshTokens.save(row)} inside {@code session()}
 * never flushed — login tokens had no DB row and refresh returned 401, while
 * register tokens (rw tx) worked, masking it.
 *
 * <p>NOT {@code @Transactional}: login must run in its OWN committed
 * transaction to reproduce the production path. Wrapping the test in a tx would
 * make login join the outer rw tx, flush the save, and hide the bug.
 */
class LoginRefreshRegressionTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RefreshTokenRepository refreshTokens;

    @Test
    void loginIssuedRefreshTokenRotatesNot401() throws Exception {
        // login with the seeded admin → 200 + tokens (own readOnly→rw tx commits)
        MvcResult login = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@gemspot.ee\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String loginRefresh = json.readTree(login.getResponse().getContentAsString())
                .get("refreshToken").asText();

        // refresh with the login-issued token → 200 + a rotated (different) token
        MvcResult refresh = mvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + loginRefresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andReturn();
        JsonNode rotated = json.readTree(refresh.getResponse().getContentAsString());
        assertThat(rotated.get("refreshToken").asText())
                .isNotEqualTo(loginRefresh); // rotated, not echoed
    }

    /**
     * The load-bearing guarantee: rotation is a conditional UPDATE, so the FIRST
     * caller to claim a jti gets 1 row and every later caller gets 0. A
     * read-then-write implementation cannot satisfy this.
     */
    @Test
    void markUsedIfUnusedClaimsExactlyOnce() throws Exception {
        String jti = jtiOf(loginRefreshToken());

        assertThat(refreshTokens.markUsedIfUnused(jti)).isEqualTo(1); // won
        assertThat(refreshTokens.markUsedIfUnused(jti)).isZero();     // already claimed
        assertThat(refreshTokens.markUsedIfUnused(UUID.randomUUID().toString()))
                .as("unknown jti must not count as a successful claim")
                .isZero();
    }

    /**
     * The regression this guards: two concurrent POST /auth/refresh with the SAME
     * token must not both succeed. Before the atomic claim both threads could read
     * {@code used == false} and both rotate, handing an attacker a live session while
     * reuse detection stayed silent.
     */
    @Test
    void concurrentRefreshOfTheSameTokenLetsExactlyOneThrough() throws Exception {
        String token = loginRefreshToken();
        String jti = jtiOf(token);

        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Callable<Integer> attempt = () -> {
            go.await();
            return mvc.perform(post("/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"refreshToken\":\"" + token + "\"}"))
                    .andReturn().getResponse().getStatus();
        };
        Future<Integer> a = pool.submit(attempt);
        Future<Integer> b = pool.submit(attempt);
        go.countDown();
        int first = a.get(30, TimeUnit.SECONDS);
        int second = b.get(30, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(List.of(first, second))
                .as("exactly one concurrent rotation may succeed; two 200s is the bug")
                .containsExactlyInAnyOrder(200, 401);
        // Deterministic consequence of the loser's 401: the family revoke wiped the
        // presented row. (Not asserting the family is *entirely* empty — the winner's
        // newly issued row races that delete, so its survival is genuinely timing-
        // dependent and would make this test flaky.)
        assertThat(refreshTokens.findByJti(jti))
                .as("the loser's 401 must revoke the family, taking the presented jti with it")
                .isEmpty();
    }

    /** Fresh login → its refresh token (own committed tx, like production). */
    private String loginRefreshToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@gemspot.ee\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return json.readTree(login.getResponse().getContentAsString())
                .get("refreshToken").asText();
    }

    /** Decodes the JWT payload (no verification needed — the test just wants the jti). */
    private String jtiOf(String refreshToken) throws Exception {
        String payload = new String(Base64.getUrlDecoder().decode(refreshToken.split("\\.")[1]));
        return json.readTree(payload).get("jti").asText();
    }
}
