package ee.gemspot.api.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Verifies the {@code Authorization: Bearer <access>} JWT and sets the security
 * context: principal = user id (so {@code CurrentUser.id()} returns it unchanged),
 * authority = {@code ROLE_<role>} (so {@code hasRole(ADMIN)} gates /admin/**).
 *
 * <p>Parity with Nest's JwtAuthGuard, but non-throwing: an absent/invalid token
 * leaves the context empty — SecurityConfig's authorization rules then produce
 * 401/403 via the entry point / access-denied handler. This lets permitAll
 * routes still attach a principal when a valid token is present.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();
            try {
                Claims claims = jwt.parseAccess(token);
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                List<SimpleGrantedAuthority> authorities = role != null
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        : List.of();
                var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                // Invalid/expired token → leave context empty; authz rules reject.
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
