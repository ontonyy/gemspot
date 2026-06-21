package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * D6 exact-JSON contract assertions against the seeded Postgres (MockMvc).
 * Riskiest endpoints: GET /places, GET /places/{slug}, the auth round-trip, and
 * admin approve. {@code @Transactional} rolls each test back so the seed row
 * counts stay stable for the sibling idempotency test (shared container).
 */
@Transactional
class ContractIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void getPlacesReturnsTenActiveCardsNoRating() throws Exception {
        mvc.perform(get("/places"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10))
                .andExpect(jsonPath("$[0].id").value("01"))
                .andExpect(jsonPath("$[9].id").value("10"))
                .andExpect(jsonPath("$[0].rating").doesNotExist())     // no rating in contract
                .andExpect(jsonPath("$[0].verifiedAt").doesNotExist()) // cards carry no verifiedAt
                .andExpect(jsonPath("$[0].distanceKm").doesNotExist()) // NON_NULL omit
                .andExpect(jsonPath("$[0].category.short").value("Ping pong"));
    }

    @Test
    void getPlaceBySlugReturnsDetailWithVerifiedAt() throws Exception {
        mvc.perform(get("/places/politseiaia-ping-pong"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.note").exists())
                .andExpect(jsonPath("$.photos[0].url").value(""))
                .andExpect(jsonPath("$.verifiedAt").value("2026-05-27T09:00:00Z"))
                .andExpect(jsonPath("$.fieldNotes.access").value("Free"))
                .andExpect(jsonPath("$.fieldNotes.lit").value("Yes"))
                .andExpect(jsonPath("$.fieldNotes.best").value("Eve"))
                .andExpect(jsonPath("$.appleMapsUrl").value(
                        "https://maps.apple.com/?ll=59.4351,24.7475&q=Politseiaia%20ping-pong"))
                .andExpect(jsonPath("$.googleMapsUrl").value(
                        "https://www.google.com/maps/search/?api=1&query=59.4351,24.7475"));
    }

    @Test
    void getPlaceBySlugOmitsVerifiedAtWhenUnset() throws Exception {
        // Löwenruh pitch is seeded with no verifiedAt → hidden-badge fallback.
        mvc.perform(get("/places/lowenruh-pitch"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verifiedAt").doesNotExist());
    }

    @Test
    void authRoundTripRegisterLoginMeRefreshRotateReuse401() throws Exception {
        // register → 201 + tokens
        MvcResult reg = mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"rt@gemspot.ee\",\"password\":\"pw12345678\",\"name\":\"RT\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("rt@gemspot.ee"))
                .andExpect(jsonPath("$.user.role").value("CLIENT"))
                .andReturn();
        JsonNode r = json.readTree(reg.getResponse().getContentAsString());
        String access = r.get("accessToken").asText();
        String refresh = r.get("refreshToken").asText();

        // login → 200
        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"rt@gemspot.ee\",\"password\":\"pw12345678\"}"))
                .andExpect(status().isOk());

        // me with access token → 200
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("rt@gemspot.ee"));

        // refresh rotates the pair → 200
        mvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());

        // reusing the now-rotated refresh token → 401 (D4 reuse detection)
        mvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminApprovePublishesPaddedActivePlace() throws Exception {
        // admin login (seeded)
        MvcResult adminLogin = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@gemspot.ee\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = json.readTree(adminLogin.getResponse().getContentAsString())
                .get("accessToken").asText();

        // a client registers + submits a place
        MvcResult reg = mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sub@gemspot.ee\",\"password\":\"pw12345678\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String clientToken = json.readTree(reg.getResponse().getContentAsString())
                .get("accessToken").asText();

        MvcResult sub = mvc.perform(post("/submissions")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Secret Hoop\",\"categoryId\":\"basketball\","
                                + "\"lat\":59.4,\"lng\":24.7,\"note\":\"great\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();
        String subId = json.readTree(sub.getResponse().getContentAsString()).get("id").asText();

        // admin approves → 200, padded id "11" (after the 10 seeded), slug from name
        mvc.perform(post("/admin/submissions/" + subId + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placeId").value("11"))
                .andExpect(jsonPath("$.placeSlug").value("secret-hoop"));
    }
}
