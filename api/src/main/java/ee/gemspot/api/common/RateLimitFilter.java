package ee.gemspot.api.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Plan 031: fixed-window rate limiting on the two unauthenticated surfaces —
 * {@code /auth/**} (credential stuffing, account creation, email-change token guessing) and
 * {@code POST /events} (anonymous unbounded row writes). Everything else passes untouched.
 *
 * <p>Over the limit → {@code 429} in the {@code {statusCode, message, error}} shape
 * {@link ee.gemspot.api.web.GlobalExceptionHandler} emits, plus {@code Retry-After}. The body is
 * written here rather than thrown, because a filter runs before the DispatcherServlet and a
 * {@code ResponseStatusException} would never reach the handler — same reason
 * {@code SecurityConfig} writes its own 401/403.
 *
 * <p>Ordered after {@link RequestLoggingFilter} (so a 429 still gets a correlation id and an
 * access-log line) and before Spring Security's chain (order -100).
 *
 * <p>ponytail: per-INSTANCE limiting, not global. State is a plain map in this JVM, and Cloud Run
 * runs N instances, so the effective global budget is {@code N × configured} and a client spread
 * across instances gets N times the allowance. That is the deliberate ceiling: it raises the cost
 * of casual abuse and of a single-host script, and it does not stop a distributed attempt. Upgrade
 * path when that matters: a shared counter (Memorystore/Redis) or an edge policy (Cloud Armor) —
 * both add infrastructure this stack does not currently own. See docs/adr/0005.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * ponytail: cap on distinct tracked keys, so the limiter cannot itself be turned into a
     * memory-exhaustion lever by rotating source addresses. At the cap the whole map is dropped —
     * crude, but a cleared window only ever grants extra allowance for one window, never less.
     */
    private static final int MAX_TRACKED_KEYS = 100_000;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    private final boolean enabled;
    private final long windowSeconds;
    private final int authLimit;
    private final int eventsLimit;

    public RateLimitFilter(
            @Value("${app.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.rate-limit.window-seconds:60}") long windowSeconds,
            @Value("${app.rate-limit.auth-per-window:60}") int authLimit,
            @Value("${app.rate-limit.events-per-window:300}") int eventsLimit) {
        this.enabled = enabled;
        this.windowSeconds = windowSeconds;
        this.authLimit = authLimit;
        this.eventsLimit = eventsLimit;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String group = group(request);
        if (!enabled || group == null) {
            chain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        long windowMs = windowSeconds * 1000L;
        long windowStart = now - (now % windowMs);

        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.clear();
        }
        Window window = windows.compute(clientKey(request) + "|" + group, (key, existing) ->
                (existing == null || existing.start != windowStart) ? new Window(windowStart) : existing);

        int limit = "auth".equals(group) ? authLimit : eventsLimit;
        if (window.count.incrementAndGet() > limit) {
            long retryAfter = Math.max(1, (windowStart + windowMs - now + 999) / 1000);
            tooManyRequests(response, retryAfter);
            return;
        }
        chain.doFilter(request, response);
    }

    /** The limited groups. Null = not rate limited. */
    private static String group(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.equals("/auth") || path.startsWith("/auth/")) {
            return "auth";
        }
        if ("POST".equalsIgnoreCase(request.getMethod()) && path.equals("/events")) {
            return "events";
        }
        return null;
    }

    /**
     * ponytail: the LAST X-Forwarded-For entry, not the first. Cloud Run appends the real caller's
     * address to whatever arrived, so a client that forges the header only pollutes the entries in
     * front of its own — the tail stays the address the infrastructure observed. The first entry is
     * fully client-controlled and would make the limit trivially bypassable.
     */
    private static String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String last = forwarded.substring(forwarded.lastIndexOf(',') + 1).trim();
            if (!last.isEmpty()) {
                return last;
            }
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }

    private static void tooManyRequests(HttpServletResponse response, long retryAfterSeconds) throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("message", "Too many requests, please try again in a moment");
        body.put("error", HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase());
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(MAPPER.writeValueAsString(body));
    }

    private static final class Window {
        private final long start;
        private final AtomicInteger count = new AtomicInteger();

        private Window(long start) {
            this.start = start;
        }
    }
}
