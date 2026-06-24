package ee.gemspot.api.service;

import ee.gemspot.api.domain.RefreshToken;
import ee.gemspot.api.dto.SessionDto;
import ee.gemspot.api.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Per-device session layer over the refresh-token family model. A family =
 * one device/login. Block C ships only {@link #revokeAll(String)} (sign out
 * everywhere) and {@link #revokeOthers(String, String)} (used by password
 * change), but the surface is shaped so exposing the session list later is
 * additive: {@link #listSessions(String)} / {@link #revokeSession(String)}.
 */
@Service
public class SessionService {

    private final RefreshTokenRepository refreshTokens;

    public SessionService(RefreshTokenRepository refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    /** All active sessions (families) for a user, newest first. Not wired to an
     *  endpoint yet — designed-for per-device listing. */
    @Transactional(readOnly = true)
    public List<SessionDto> listSessions(String userId, String currentFamilyId) {
        Map<String, RefreshToken> byFamily = new LinkedHashMap<>();
        for (RefreshToken row : refreshTokens.findByUserId(userId)) {
            // Keep the earliest-issued row per family as the session anchor.
            byFamily.merge(row.getFamilyId(), row, (a, b) ->
                    a.getCreatedAt() != null && b.getCreatedAt() != null
                            && a.getCreatedAt().isBefore(b.getCreatedAt()) ? a : b);
        }
        List<SessionDto> sessions = new ArrayList<>();
        for (RefreshToken row : byFamily.values()) {
            sessions.add(new SessionDto(
                    row.getFamilyId(),
                    row.getCreatedAt(),
                    row.getExpiresAt(),
                    row.getFamilyId().equals(currentFamilyId)));
        }
        sessions.sort(Comparator.comparing(
                SessionDto::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return sessions;
    }

    /** Revoke one device session (its whole token family). */
    public void revokeSession(String familyId) {
        refreshTokens.deleteByFamilyId(familyId);
    }

    /** Sign out everywhere — revoke every session for the user. */
    public void revokeAll(String userId) {
        refreshTokens.deleteByUserId(userId);
    }

    /** Revoke every session except the given family (keep the acting device). */
    public void revokeOthers(String userId, String keepFamilyId) {
        for (RefreshToken row : refreshTokens.findByUserId(userId)) {
            if (!row.getFamilyId().equals(keepFamilyId)) {
                refreshTokens.deleteByFamilyId(row.getFamilyId());
            }
        }
    }
}
