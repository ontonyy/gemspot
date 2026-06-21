package ee.gemspot.api.dto;

/** name is nullable and serialized as null (not omitted). role: CLIENT|ADMIN. */
public record AuthUserDto(String id, String email, String name, String role) {}
