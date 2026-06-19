package ee.gemspot.api.dto;

public record AdminStatsDto(
        long places,
        long activePlaces,
        long pendingSubmissions,
        long openReports,
        long users
) {}
