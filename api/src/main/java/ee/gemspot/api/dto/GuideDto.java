package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GuideDto(
        String id,
        String title,
        String subtitle,
        String coverCategory,
        String coverIcon,
        int count,
        List<String> spotSlugs
) {}
