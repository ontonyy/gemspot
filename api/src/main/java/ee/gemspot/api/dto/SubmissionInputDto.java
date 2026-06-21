package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SubmissionInputDto(
        @NotBlank String name,
        @Pattern(regexp = "tabletennis|basketball|football|tennis|padel|scenic|sakura") String categoryId,
        double lat,
        double lng,
        @NotNull String note,
        @Min(0) Integer photoCount,
        @Size(max = 6) List<@NotNull String> photoUrls
) {}
