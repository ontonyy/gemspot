package ee.gemspot.api.dto;

public record AuthResponseDto(AuthUserDto user, String accessToken, String refreshToken) {}
