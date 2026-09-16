package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Malformed admin input must render as 400, not a 500 + stack trace: the status
 * filters used to reach {@code Enum.valueOf} unguarded, and the PATCH DTOs carried
 * {@code @Pattern} without {@code @NotNull} (Bean Validation passes null).
 */
class AdminInputValidationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String adminToken;

    @BeforeEach
    void loginAdmin() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@gemspot.ee\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = json.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void lowercaseSubmissionStatusFilterIsBadRequest() throws Exception {
        mvc.perform(get("/admin/submissions").param("status", "pending")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void bogusReportStatusFilterIsBadRequest() throws Exception {
        mvc.perform(get("/admin/reports").param("status", "bogus")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void emptyPlaceStatusBodyIsBadRequest() throws Exception {
        mvc.perform(patch("/admin/places/{id}/status", "any-id")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void emptyReportStatusBodyIsBadRequest() throws Exception {
        mvc.perform(patch("/admin/reports/{id}/status", "any-id")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
