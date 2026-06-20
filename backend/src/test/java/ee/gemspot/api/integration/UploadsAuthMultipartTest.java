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

    @Test
    void unauthMultipartUpload401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "y.jpg", "image/jpeg", new byte[]{1, 2, 3});
        mvc.perform(multipart("/uploads").file(file))
                .andExpect(status().isUnauthorized());
    }
}
