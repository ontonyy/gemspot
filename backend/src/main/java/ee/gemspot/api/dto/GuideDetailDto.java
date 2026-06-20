package ee.gemspot.api.dto;

import java.util.List;

/** Response of GET /guides/{id}: { guide, spots }. */
public record GuideDetailDto(GuideDto guide, List<PlaceCardDto> spots) {}
