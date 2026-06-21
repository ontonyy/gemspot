package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

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
}
