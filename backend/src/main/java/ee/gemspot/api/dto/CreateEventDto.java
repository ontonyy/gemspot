package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateEventDto(
        @NotBlank @Size(max = 64) String name,
        Map<String, Object> props,
        String placeId
) {}
