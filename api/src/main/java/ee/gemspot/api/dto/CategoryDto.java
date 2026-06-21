package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Byte-identical to web CategoryDto. `short` is a Java keyword → JSON-mapped. */
public record CategoryDto(
        String id,
        String label,
        @JsonProperty("short") String shortLabel,
        String color,
        String glyph
) {}
