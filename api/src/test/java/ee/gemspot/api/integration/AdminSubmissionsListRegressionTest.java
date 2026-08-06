package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.gemspot.api.repository.SubmissionRepository;
import ee.gemspot.api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression for the prod moderation-queue 500: AdminService.listSubmissions
 * touches the lazy {@code Submission.photos} collection, which throws
 * LazyInitializationException once the request runs outside a transaction.
 * ContractIntegrationTest can't catch it — its {@code @Transactional} keeps a
 * session open for the whole test. This class is deliberately NOT transactional
 * and cleans up after itself so the seed-count test stays stable.
 */
class AdminSubmissionsListRegressionTest extends AbstractIntegrationTest {

    private static final String EMAIL = "lazyinit-regression@gemspot.ee";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired SubmissionRepository submissions;
    @Autowired UserRepository users;

    @AfterEach
    void cleanup() {
        users.findByEmail(EMAIL).ifPresent(u -> {
            submissions.findAllByOrderBySubmittedAtDesc().stream()
                    .filter(s -> u.getId().equals(s.getUserId()))
                    .forEach(submissions::delete);
            users.delete(u);
        });
    }

    @Test
    void adminListWithLazyPhotosWorksOutsideTestTransaction() throws Exception {
        MvcResult reg = mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"pw12345678\",\"name\":\"LazyInit\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String userToken = json.readTree(reg.getResponse().getContentAsString()).get("accessToken").asText();

        mvc.perform(post("/submissions")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Lazy photos spot\",\"categoryId\":\"basketball\"," +
                                "\"lat\":59.44,\"lng\":24.75,\"note\":\"regression\"," +
                                "\"photoUrls\":[\"https://example.com/p.jpg\"]}"))
                .andExpect(status().isCreated());

        MvcResult login = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@gemspot.ee\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = json.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();

        mvc.perform(get("/admin/submissions").param("status", "PENDING")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Lazy photos spot')].photoUrls[0]")
                        .value("https://example.com/p.jpg"));
    }
}
