package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** reason: closed|wrong-location|not-free|other. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportInputDto(
        @NotBlank String placeId,
        @NotBlank String placeSlug,
        @NotBlank String placeName,
        @Pattern(regexp = "closed|wrong-location|not-free|other") String reason,
        String note
) {}
