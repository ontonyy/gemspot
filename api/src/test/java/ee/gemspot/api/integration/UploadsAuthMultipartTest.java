package ee.gemspot.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import ee.gemspot.api.storage.StorageService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UploadsAuthMultipartTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @MockBean StorageService storage;

    private String clientToken() throws Exception {
        MvcResult reg = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"up@gemspot.ee\",\"password\":\"pw12345678\",\"name\":\"UP\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(reg.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void authedMultipartUpload201() throws Exception {
        when(storage.save(any())).thenReturn(new StorageService.StoredFile("https://x/y.jpg"));
        String token = clientToken();
        MockMultipartFile file = new MockMultipartFile(
                "file", "y.jpg", "image/jpeg", new byte[]{1, 2, 3});
        mvc.perform(multipart("/uploads").file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("https://x/y.jpg"));
    }

    /**
     * Regression: a 5xx thrown inside an authed handler must surface as the real
     * status, not be masked as 401. Spring re-dispatches the error to /error; the
     * JwtAuthFilter (OncePerRequestFilter) is skipped there, so without permitAll
     * on the ERROR dispatch the empty context fails authorization and the entry
     * point overwrites the response with a bogus 401 "Authentication required".
     */
    @Test
    void authedHandlerThrowsSurfacesRealStatusNot401() throws Exception {
        when(storage.save(any())).thenThrow(new RuntimeException("storage boom"));
        String token = clientToken();
        MockMultipartFile file = new MockMultipartFile(
                "file", "y.jpg", "image/jpeg", new byte[]{1, 2, 3});
        mvc.perform(multipart("/uploads").file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().is5xxServerError());
    }

    @Test
    void unauthMultipartUpload401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "y.jpg", "image/jpeg", new byte[]{1, 2, 3});
        mvc.perform(multipart("/uploads").file(file))
                .andExpect(status().isUnauthorized());
    }
}
