package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * Plan 032 / ADR 0006: {@code refreshToken} is carried on the record so the service
 * layer is unchanged, but {@code @JsonIgnore} keeps it off the wire — the controller
 * reads it here and puts it in an HttpOnly cookie instead. If it ever serializes
 * again, the credential is back in reach of any script on the origin.
 */
public record AuthResponseDto(AuthUserDto user, String accessToken, @JsonIgnore String refreshToken) {}
