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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

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

    @Nested
    class OauthFacebook {
        // Spy stubs env() so the app-id/secret gate passes; RestClient is bound to
        // MockRestServiceServer so Graph calls (/debug_token, /me) are faked.
        private AuthService configured() {
            AuthService s = spy(svc);
            doReturn("app").when(s).env("FACEBOOK_APP_ID");
            doReturn("secret").when(s).env("FACEBOOK_APP_SECRET");
            return s;
        }

        private MockRestServiceServer bindMock(AuthService s) {
            RestClient.Builder builder = RestClient.builder();
            MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
            s.setRestClient(builder.build());
            return server;
        }

        @Test
        void rejectsWhenNotConfigured() {
            AuthService s = spy(svc);
            doReturn(null).when(s).env("FACEBOOK_APP_ID");
            doReturn(null).when(s).env("FACEBOOK_APP_SECRET");
            ResponseStatusException ex = expectStatus(HttpStatus.UNAUTHORIZED,
                    () -> s.oauthFacebook("tok"));
            assertThat(ex.getReason()).isEqualTo("Facebook sign-in is not configured");
        }

        @Test
        void rejectsInvalidToken() {
            AuthService s = configured();
            MockRestServiceServer server = bindMock(s);
            server.expect(requestTo(containsString("/debug_token")))
                    .andRespond(withSuccess("{\"data\":{\"is_valid\":false,\"app_id\":\"app\"}}",
                            MediaType.APPLICATION_JSON));

            expectStatus(HttpStatus.UNAUTHORIZED, () -> s.oauthFacebook("bad"));
            server.verify();
        }

        @Test
        void createsAccountForNewEmail() {
            AuthService s = configured();
            MockRestServiceServer server = bindMock(s);
            server.expect(requestTo(containsString("/debug_token")))
                    .andRespond(withSuccess("{\"data\":{\"is_valid\":true,\"app_id\":\"app\"}}",
                            MediaType.APPLICATION_JSON));
            server.expect(requestTo(containsString("/me")))
                    .andRespond(withSuccess("{\"id\":\"fb1\",\"email\":\"New@B.com\",\"name\":\"Fb User\"}",
                            MediaType.APPLICATION_JSON));
            when(users.findByEmail("new@b.com")).thenReturn(Optional.empty());

            AuthResponseDto res = s.oauthFacebook("good");

            assertThat(res.user().email()).isEqualTo("new@b.com");
            assertThat(res.accessToken()).isNotBlank();
            ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
            verify(users).save(saved.capture());
            assertThat(saved.getValue().getProvider()).isEqualTo("facebook");
            assertThat(saved.getValue().getProviderId()).isEqualTo("fb1");
            assertThat(saved.getValue().getPasswordHash()).isNull();
            server.verify();
        }

        @Test
        void linksProviderForExistingEmail() {
            AuthService s = configured();
            MockRestServiceServer server = bindMock(s);
            server.expect(requestTo(containsString("/debug_token")))
                    .andRespond(withSuccess("{\"data\":{\"is_valid\":true,\"app_id\":\"app\"}}",
                            MediaType.APPLICATION_JSON));
            server.expect(requestTo(containsString("/me")))
                    .andRespond(withSuccess("{\"id\":\"fb1\",\"email\":\"a@b.com\",\"name\":\"Fb User\"}",
                            MediaType.APPLICATION_JSON));
            User existing = user("u1", "a@b.com", "hash", UserRole.CLIENT);
            when(users.findByEmail("a@b.com")).thenReturn(Optional.of(existing));
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(profile("Ann")));

            AuthResponseDto res = s.oauthFacebook("good");

            assertThat(res.user().id()).isEqualTo("u1");
            assertThat(existing.getProvider()).isEqualTo("facebook");
            assertThat(existing.getProviderId()).isEqualTo("fb1");
            verify(users).save(existing);
            server.verify();
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
