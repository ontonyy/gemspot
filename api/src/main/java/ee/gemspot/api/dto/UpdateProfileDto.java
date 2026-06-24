package ee.gemspot.api.dto;

import jakarta.validation.constraints.Size;

/**
 * PATCH /auth/me. Profile fields only. name ≤60 (matches register); avatarUrl ≤2048.
 * Both nullable/blank → cleared (service trims; blank becomes null = removal).
 */
public record UpdateProfileDto(
        @Size(max = 60) String name,
        @Size(max = 2048) String avatarUrl
) {}
