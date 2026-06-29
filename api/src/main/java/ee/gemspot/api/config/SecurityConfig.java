package ee.gemspot.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.gemspot.api.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Stateless JWT security (Block 5). CSRF off (token auth, no cookies/sessions).
 * Route matrix mirrors the Nest guards; the JWT filter sets the principal/role.
 * Unauthenticated → 401, wrong role → 403, both in the Nest HttpException body
 * shape the SPA reads.
 */
@Configuration
public class SecurityConfig {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter)
            throws Exception {
        http
            // Uses the bean named "corsConfigurationSource" (see CorsConfig).
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ERROR dispatch must not re-authenticate: JwtAuthFilter is a
                // OncePerRequestFilter and is skipped on the error dispatch, so the
                // context is empty there. Without this, any 4xx/5xx on an authed
                // route (e.g. a 500 from storage on /uploads) is re-dispatched to
                // /error, fails authorization, and is masked as a misleading 401
                // "Authentication required". Permit ERROR so the real status/body shows.
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                // Public reads + auth endpoints (except /auth/me).
                .requestMatchers("/health").permitAll()
                // Actuator probes + Prometheus scrape (D8). Network-scoped in prod.
                .requestMatchers("/actuator/health/**", "/actuator/prometheus").permitAll()
                .requestMatchers("/places/**").permitAll()
                .requestMatchers("/categories").permitAll()
                .requestMatchers("/guides/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/events").permitAll()
                .requestMatchers("/auth/me").authenticated()
                .requestMatchers("/auth/password", "/auth/logout-all").authenticated()
                // Re-auth required to request a change; /auth/email/verify stays
                // public (token in the link is the bearer of authority).
                .requestMatchers("/auth/email/change-request").authenticated()
                .requestMatchers("/auth/**").permitAll()
                // Authenticated user surface.
                .requestMatchers("/saved/**").authenticated()
                .requestMatchers("/submissions/**").authenticated()
                .requestMatchers("/reports/**").authenticated()
                .requestMatchers("/uploads").authenticated()
                // Admin panel.
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                .authenticationEntryPoint(entryPoint())
                .accessDeniedHandler(accessDeniedHandler())
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static AuthenticationEntryPoint entryPoint() {
        return (request, response, ex) ->
                write(response, HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    private static AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) ->
                write(response, HttpStatus.FORBIDDEN, "Admin access required");
    }

    private static void write(HttpServletResponse response, HttpStatus status, String message)
            throws java.io.IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", status.value());
        body.put("message", message);
        body.put("error", status.getReasonPhrase());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(MAPPER.writeValueAsString(body));
    }
}
