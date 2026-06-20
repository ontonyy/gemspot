package ee.gemspot.api.service;

import ee.gemspot.api.domain.Profile;
import ee.gemspot.api.domain.RefreshToken;
import ee.gemspot.api.domain.User;
import ee.gemspot.api.domain.UserRole;
import ee.gemspot.api.dto.AuthResponseDto;
import ee.gemspot.api.dto.AuthUserDto;
import ee.gemspot.api.repository.ProfileRepository;
import ee.gemspot.api.repository.RefreshTokenRepository;
import ee.gemspot.api.repository.UserRepository;
import ee.gemspot.api.security.JwtService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Port of {@code auth.service.spec.ts}: register conflict/lowercase/hash/token;
 * login unknown/wrong-pw/valid; refresh garbage/wrong-typ/rotate + D4 reuse; me
 * missing/ok; oauth not-configured. Mocked repos, REAL JwtService + encoder.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock UserRepository users;
    @Mock ProfileRepository profiles;
    @Mock RefreshTokenRepository refreshTokens;

    private final JwtService jwt = new JwtService(
            "test-access-secret", "test-refresh-secret", "15m", "30d");
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private AuthService svc;

    @BeforeEach
    void setUp() {
        svc = new AuthService(users, profiles, refreshTokens, encoder, jwt);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId("u1");
            return u;
        });
    }

    private static ResponseStatusException expectStatus(HttpStatus status, org.assertj.core.api.ThrowableAssert.ThrowingCallable c) {
        ResponseStatusException ex = (ResponseStatusException) org.assertj.core.api.Assertions
                .catchThrowable(c);
        assertThat(ex).isInstanceOf(ResponseStatusException.class);
        assertThat(ex.getStatusCode()).isEqualTo(status);
        return ex;
    }

    @Nested
    class Register {
        @Test
        void rejectsAlreadyRegisteredEmail() {
            when(users.existsByEmail("a@b.com")).thenReturn(true);
            expectStatus(HttpStatus.CONFLICT,
                    () -> svc.register("A@B.com", "pw123456", null));
        }

        @Test
        void lowercasesTrimsHashesAndReturnsSession() {
            when(users.existsByEmail("a@b.com")).thenReturn(false);

            AuthResponseDto res = svc.register("  A@B.com ", "pw123456", " Ann ");

            verify(users).existsByEmail("a@b.com");
            assertThat(res.user()).isEqualTo(new AuthUserDto("u1", "a@b.com", "Ann", "CLIENT"));
            assertThat(res.accessToken()).isNotBlank();
            assertThat(res.refreshToken()).isNotBlank();

            ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
            verify(users).save(saved.capture());
            String stored = saved.getValue().getPasswordHash();
            assertThat(stored).isNotEqualTo("pw123456");
            assertThat(encoder.matches("pw123456", stored)).isTrue();
        }
    }

    @Nested
    class Login {
        @Test
        void rejectsUnknownEmail() {
            when(users.findByEmail("x@y.com")).thenReturn(Optional.empty());
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.login("x@y.com", "pw"));
        }

        @Test
        void rejectsWrongPassword() {
            when(users.findByEmail("a@b.com")).thenReturn(Optional.of(
                    user("u1", "a@b.com", encoder.encode("correct"), UserRole.CLIENT)));
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.login("a@b.com", "wrong"));
        }

        @Test
        void issuesTokensForValidCredentials() {
            when(users.findByEmail("a@b.com")).thenReturn(Optional.of(
                    user("u1", "a@b.com", encoder.encode("correct"), UserRole.ADMIN)));
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(profile("Ann")));

            AuthResponseDto res = svc.login("a@b.com", "correct");
            assertThat(res.user().role()).isEqualTo("ADMIN");
            assertThat(res.accessToken()).isNotBlank();
        }
    }

    @Nested
    class Refresh {
        @Test
        void rejectsGarbageRefreshToken() {
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.refresh("not-a-jwt"));
        }

        @Test
        void rejectsAccessTokenUsedAsRefresh() {
            // Access token is signed with a different key → parseRefresh fails → 401.
            String access = jwt.createAccess("u1", "a@b.com", "CLIENT");
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.refresh(access));
        }

        @Test
        void rotatesTokensForValidRefresh() {
            JwtService.RefreshSigned signed = jwt.createRefresh("u1", "jti-1", "fam-1");
            RefreshToken row = refreshRow("jti-1", "u1", "fam-1", false);
            when(refreshTokens.findByJti("jti-1")).thenReturn(Optional.of(row));
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "a@b.com", "x", UserRole.CLIENT)));
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());

            AuthResponseDto res = svc.refresh(signed.token());
            assertThat(res.user().id()).isEqualTo("u1");
            assertThat(res.accessToken()).isNotBlank();
            assertThat(res.refreshToken()).isNotBlank();
            assertThat(row.isUsed()).isTrue(); // presented jti marked used (rotation)
        }

        @Test
        void reusedRefreshTokenKillsTheFamily() {
            JwtService.RefreshSigned signed = jwt.createRefresh("u1", "jti-1", "fam-1");
            RefreshToken used = refreshRow("jti-1", "u1", "fam-1", true);
            when(refreshTokens.findByJti("jti-1")).thenReturn(Optional.of(used));

            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.refresh(signed.token()));
            verify(refreshTokens).deleteByFamilyId("fam-1");
            verify(users, never()).findById(any());
        }
    }

    @Nested
    class Me {
        @Test
        void throwsWhenAccountGone() {
            when(users.findById("missing")).thenReturn(Optional.empty());
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.me("missing"));
        }

        @Test
        void returnsCurrentUserView() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "a@b.com", "x", UserRole.CLIENT)));
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(profile("Ann")));
            assertThat(svc.me("u1")).isEqualTo(new AuthUserDto("u1", "a@b.com", "Ann", "CLIENT"));
        }
    }

    @Nested
    class OauthGoogle {
        @Test
        void rejectsWhenNotConfigured() {
            // GOOGLE_CLIENT_ID is unset in the test environment (no live HTTP call).
            Assumptions.assumeTrue(System.getenv("GOOGLE_CLIENT_ID") == null);
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.oauthGoogle("tok"));
        }
    }

    private static User user(String id, String email, String hash, UserRole role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setPasswordHash(hash);
        u.setRole(role);
        return u;
    }

    private static Profile profile(String name) {
        Profile p = new Profile();
        p.setName(name);
        return p;
    }

    private static RefreshToken refreshRow(String jti, String userId, String fam, boolean used) {
        RefreshToken r = new RefreshToken();
        r.setJti(jti);
        r.setUserId(userId);
        r.setFamilyId(fam);
        r.setUsed(used);
        r.setExpiresAt(Instant.now().plusSeconds(3600));
        return r;
    }
}
