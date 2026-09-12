package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Plan 003: {@code POST /submissions} used to accept any {@code double} for
 * lat/lng, so an off-planet coordinate persisted and broke map rendering once
 * approved. {@code @Transactional} rolls the accepted submission back so the
 * seed-count assertions in the rest of the suite stay stable.
 */
@Transactional
class SubmissionGeoValidationTest extends AbstractIntegrationTest {

    private static final String EMAIL = "geo-validation@gemspot.ee";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String token;

    @BeforeEach
    void register() throws Exception {
        MvcResult reg = mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"pw12345678\",\"name\":\"Geo\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        token = json.readTree(reg.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void outOfRangeLatitudeIsRejected() throws Exception {
        submit(91.0, 24.745)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void outOfRangeLongitudeIsRejected() throws Exception {
        submit(59.437, 181.0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    void tallinnCoordinateIsAccepted() throws Exception {
        submit(59.437, 24.745).andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.ResultActions submit(double lat, double lng) throws Exception {
        return mvc.perform(post("/submissions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Geo bounds spot\",\"categoryId\":\"basketball\",\"lat\":" + lat
                        + ",\"lng\":" + lng + ",\"note\":\"plan 003\"}"));
    }
}
