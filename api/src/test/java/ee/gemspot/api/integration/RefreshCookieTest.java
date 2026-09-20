package ee.gemspot.api.integration;

import ee.gemspot.api.security.RefreshCookies;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Plan 032 / ADR 0006: the refresh token's transport is now an HttpOnly cookie.
 * This is a contract test — every assertion here is a promise the SPA and any
 * future client depend on, and the whole point of the change is lost if any of
 * them silently regresses (a body-borne token is readable by script again).
 *
 * <p>The trusted origin is the test default of {@code app.cors.origin},
 * {@code http://localhost:5173}.
 */
class RefreshCookieTest extends AbstractIntegrationTest {

    private static final String ORIGIN = "http://localhost:5173";

    @Autowired MockMvc mvc;

    @Test
    void loginSetsHttpOnlyRefreshCookieWithTheExpectedAttributes() throws Exception {
        String setCookie = setCookieHeader(login());

        assertThat(setCookie)
                .as("the credential must be unreachable from page script")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Lax")
                .contains("Path=/auth")
                .contains("Max-Age=2592000"); // 30d, matching JWT_REFRESH_TTL
    }

    @Test
    void authResponseBodyCarriesNoRefreshToken() throws Exception {
        mvc.perform(loginRequest())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    @Test
    void refreshReadsTheCookieWithNoBodyTokenAndRotatesIt() throws Exception {
        Cookie issued = refreshCookie(login());

        MvcResult refreshed = mvc.perform(post("/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(issued))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();

        assertThat(refreshCookie(refreshed).getValue())
                .as("rotation must replace the cookie, not echo it")
                .isNotEqualTo(issued.getValue());
    }

    @Test
    void refreshWithoutTheCookieIs401() throws Exception {
        mvc.perform(post("/auth/refresh").header(HttpHeaders.ORIGIN, ORIGIN))
                .andExpect(status().isUnauthorized());
    }

    /**
     * The CSRF defence. The cookie now rides along automatically, so attacker.example
     * could otherwise POST /auth/refresh from a page the user is visiting and rotate
     * (or, with SameSite=None, actually use) the session. Origin is browser-set and
     * page script cannot forge it.
     */
    @Test
    void refreshFromAnUntrustedOriginIs403EvenWithAValidCookie() throws Exception {
        Cookie issued = refreshCookie(login());

        mvc.perform(post("/auth/refresh")
                        .header(HttpHeaders.ORIGIN, "https://attacker.example")
                        .cookie(issued))
                .andExpect(status().isForbidden());

        mvc.perform(post("/auth/refresh").cookie(issued))
                .andExpect(status().isForbidden()); // no Origin at all
    }

    @Test
    void logoutClearsTheCookie() throws Exception {
        MvcResult out = mvc.perform(post("/auth/logout")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(refreshCookie(login())))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(setCookieHeader(out))
                .as("only the server can clear an HttpOnly cookie; logout must actually do it")
                .contains("Max-Age=0");
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder loginRequest() {
        return post("/auth/login")
                .header(HttpHeaders.ORIGIN, ORIGIN)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@gemspot.ee\",\"password\":\"admin1234\"}");
    }

    private MvcResult login() throws Exception {
        return mvc.perform(loginRequest()).andExpect(status().isOk()).andReturn();
    }

    private static String setCookieHeader(MvcResult result) {
        String header = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(header).as("no Set-Cookie on the response").isNotNull();
        return header;
    }

    private static Cookie refreshCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie(RefreshCookies.NAME);
        assertThat(cookie).as("no %s cookie on the response", RefreshCookies.NAME).isNotNull();
        return cookie;
    }
}
