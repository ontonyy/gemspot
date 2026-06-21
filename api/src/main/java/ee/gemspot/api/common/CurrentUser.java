package ee.gemspot.api.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Resolves the signed-in user's id from the security context.
 *
 * <p>B4 seam: with the permit-all stub (Block 5 replaces it) the authentication
 * is the anonymous token, so {@link #id()} returns its name. Block 5 wires the
 * JWT principal so {@code authentication.getName()} is the real user id, with no
 * change to the controllers that call this. Mirrors the Nest {@code @CurrentUser}
 * decorator seam.
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static String id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
