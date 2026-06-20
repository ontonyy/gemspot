package ee.gemspot.api.dto;

/** name nullable (serialized null). role: CLIENT|ADMIN. */
public record AdminUserDto(
        String id,
        String email,
        String name,
        String role,
        String createdAt
) {}
