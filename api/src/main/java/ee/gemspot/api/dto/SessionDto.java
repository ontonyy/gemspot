package ee.gemspot.api.dto;

import java.time.Instant;

/**
 * One device session = one refresh-token family. Shaped for per-device listing
 * (Block C designs the service; only logout-all is wired now). {@code current}
 * marks the acting device once the access token carries the family (future).
 */
public record SessionDto(
        String familyId,
        Instant createdAt,
        Instant expiresAt,
        boolean current) {}
