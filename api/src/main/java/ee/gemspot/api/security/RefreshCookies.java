package ee.gemspot.api.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The refresh token's transport (plan 032, ADR 0006). It travels as an HttpOnly
 * cookie, never in a response body and never through JavaScript, so an XSS can
 * act as the user while the page is open but cannot copy the 30-day credential
 * off the machine.
 *
 * <p>The CSRF guard lives here rather than in its own class on purpose: it exists
 * only because this cookie is ambient, and keeping them together means a future
 * cookie-reading endpoint cannot be added without meeting the guard.
 *
 * <p>Attributes are config, not constants — see application.yml. The defaults
 * describe a SAME-ORIGIN deployment (web and API behind one host). On the current
 * cross-site deployment the operator must set {@code AUTH_COOKIE_SAMESITE=None},
 * which makes this a third-party cookie that Safari blocks outright.
 */
@Component
public class RefreshCookies {

    public static final String NAME = "gemspot_rt";

    private final boolean secure;
    private final String sameSite;
    private final String path;
    private final Duration maxAge;
    private final Set<String> trustedOrigins;

    public RefreshCookies(
            @Value("${app.auth.refresh-cookie.secure}") boolean secure,
            @Value("${app.auth.refresh-cookie.same-site}") String sameSite,
            @Value("${app.auth.refresh-cookie.path}") String path,
            @Value("${app.auth.refresh-cookie.max-age}") Duration maxAge,
            @Value("${app.cors.origin}") String corsOrigin) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.path = path;
        this.maxAge = maxAge;
        this.trustedOrigins = Arrays.stream(corsOrigin.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    /** Issues (or rotates) the credential. Called on every session-minting response. */
    public void issue(HttpServletResponse response, String refreshToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(refreshToken, maxAge).toString());
    }

    /** Expires the credential in the browser. Same attributes, zero age. */
    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, build("", Duration.ZERO).toString());
    }

    /** The presented credential, if any. Absence is a 401, not an error here. */
    public Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .filter(v -> v != null && !v.isBlank())
                .findFirst();
    }

    /**
     * CSRF: the cookie rides along automatically, so an endpoint that reads it must
     * prove the request came from our own app. Browsers always send Origin on POST
     * and page script cannot forge it. A missing Origin is refused too — every real
     * caller is a browser POST.
     *
     * <p>Does NOT defend against an XSS on the allowed origin itself; that attacker
     * already holds the live session, which is a different boundary.
     */
    public void requireTrustedOrigin(HttpServletRequest request) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin == null || !trustedOrigins.contains(origin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Untrusted origin");
        }
    }

    private ResponseCookie build(String value, Duration age) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(age)
                .build();
    }

}
