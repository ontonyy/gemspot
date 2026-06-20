package ee.gemspot.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record MergeSavedDto(
        @NotNull @Size(max = 500) List<@NotNull String> placeIds
) {}
