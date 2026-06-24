package ee.gemspot.api.service;

import ee.gemspot.api.domain.EmailChangeToken;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
    @Mock ee.gemspot.api.repository.EmailChangeTokenRepository emailChangeTokens;
    @Mock MailService mail;

    private final JwtService jwt = new JwtService(
            "test-access-secret", "test-refresh-secret", "15m", "30d");
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private AuthService svc;

    @BeforeEach
    void setUp() {
        svc = new AuthService(users, profiles, refreshTokens, emailChangeTokens, encoder, jwt,
                new SessionService(refreshTokens), mail, "http://localhost:5173");
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
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(profile("Ann")));

            AuthResponseDto res = svc.register("  A@B.com ", "pw123456", " Ann ");

            verify(users).existsByEmail("a@b.com");
            assertThat(res.user())
                    .isEqualTo(new AuthUserDto("u1", "a@b.com", "Ann", "CLIENT", null, null, null, true, null, null, "none"));
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
            assertThat(svc.me("u1"))
                    .isEqualTo(new AuthUserDto("u1", "a@b.com", "Ann", "CLIENT", null, null, null, true, null, null, "none"));
        }

        @Test
        void exposesProviderAvatarAndNoPasswordForOauthOnly() {
            User oauth = user("u1", "a@b.com", null, UserRole.CLIENT); // null hash = OAuth-only
            oauth.setProvider("google");
            when(users.findById("u1")).thenReturn(Optional.of(oauth));
            Profile p = profile("Ann");
            p.setAvatarUrl("https://cdn/avatar.png");
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(p));

            AuthUserDto dto = svc.me("u1");
            assertThat(dto.hasPassword()).isFalse();
            assertThat(dto.provider()).isEqualTo("google");
            assertThat(dto.avatarUrl()).isEqualTo("https://cdn/avatar.png");
        }
    }

    @Nested
    class UpdateProfile {
        @Test
        void updatesNameTrimmed() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "a@b.com", "x", UserRole.CLIENT)));
            Profile p = profile("Old");
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(p));

            AuthUserDto dto = svc.updateProfile("u1", "  New Name ", null);
            assertThat(dto.name()).isEqualTo("New Name");
            assertThat(p.getName()).isEqualTo("New Name");
            verify(profiles).save(p);
        }

        @Test
        void updatesAvatarUrl() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "a@b.com", "x", UserRole.CLIENT)));
            Profile p = profile("Ann");
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(p));

            AuthUserDto dto = svc.updateProfile("u1", "Ann", "https://cdn/a.png");
            assertThat(dto.avatarUrl()).isEqualTo("https://cdn/a.png");
            assertThat(p.getAvatarUrl()).isEqualTo("https://cdn/a.png");
        }

        @Test
        void blankAvatarRemovesIt() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "a@b.com", "x", UserRole.CLIENT)));
            Profile p = profile("Ann");
            p.setAvatarUrl("https://cdn/old.png");
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(p));

            AuthUserDto dto = svc.updateProfile("u1", "Ann", "   ");
            assertThat(dto.avatarUrl()).isNull();
            assertThat(p.getAvatarUrl()).isNull();
        }

        @Test
        void blankNameClearsIt() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "a@b.com", "x", UserRole.CLIENT)));
            Profile p = profile("Ann");
            when(profiles.findByUserId("u1")).thenReturn(Optional.of(p));

            AuthUserDto dto = svc.updateProfile("u1", "   ", null);
            assertThat(dto.name()).isNull();
            assertThat(p.getName()).isNull();
        }

        @Test
        void throwsWhenAccountGone() {
            when(users.findById("missing")).thenReturn(Optional.empty());
            expectStatus(HttpStatus.UNAUTHORIZED,
                    () -> svc.updateProfile("missing", "x", null));
        }
    }

    @Nested
    class ChangePassword {
        @Test
        void setsPasswordForOauthOnlyAccountWithoutCurrent() {
            User oauth = user("u1", "a@b.com", null, UserRole.CLIENT); // no local password
            when(users.findById("u1")).thenReturn(Optional.of(oauth));
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());

            AuthResponseDto res = svc.changePassword("u1", null, "newpw12345");

            assertThat(encoder.matches("newpw12345", oauth.getPasswordHash())).isTrue();
            assertThat(res.accessToken()).isNotBlank();
            assertThat(res.refreshToken()).isNotBlank();
        }

        @Test
        void changesPasswordWithCorrectCurrent() {
            User u = user("u1", "a@b.com", encoder.encode("oldpw1234"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());

            svc.changePassword("u1", "oldpw1234", "newpw5678");

            assertThat(encoder.matches("newpw5678", u.getPasswordHash())).isTrue();
            assertThat(encoder.matches("oldpw1234", u.getPasswordHash())).isFalse();
        }

        @Test
        void rejectsIncorrectCurrentPassword() {
            User u = user("u1", "a@b.com", encoder.encode("oldpw1234"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));

            expectStatus(HttpStatus.BAD_REQUEST,
                    () -> svc.changePassword("u1", "wrongpw", "newpw5678"));
            verify(refreshTokens, never()).deleteByUserId(any());
        }

        @Test
        void rejectsMissingCurrentForLocalAccount() {
            User u = user("u1", "a@b.com", encoder.encode("oldpw1234"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));

            expectStatus(HttpStatus.BAD_REQUEST,
                    () -> svc.changePassword("u1", null, "newpw5678"));
        }

        @Test
        void revokesOtherSessionsButKeepsActingDevice() {
            User u = user("u1", "a@b.com", encoder.encode("oldpw1234"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());

            AuthResponseDto res = svc.changePassword("u1", "oldpw1234", "newpw5678");

            // All existing families revoked...
            verify(refreshTokens).deleteByUserId("u1");
            // ...then a fresh session minted for the acting device (new tokens returned).
            verify(refreshTokens).save(any(RefreshToken.class));
            assertThat(res.refreshToken()).isNotBlank();
        }

        @Test
        void throwsWhenAccountGone() {
            when(users.findById("missing")).thenReturn(Optional.empty());
            expectStatus(HttpStatus.UNAUTHORIZED,
                    () -> svc.changePassword("missing", "x", "newpw5678"));
        }
    }

    @Nested
    class LogoutAll {
        @Test
        void revokesAllFamilies() {
            svc.logoutAll("u1");
            verify(refreshTokens).deleteByUserId("u1");
        }
    }

    @Nested
    class DeleteAccount {
        @Test
        void deletesLocalAccountWithCorrectPassword() {
            User u = user("u1", "a@b.com", encoder.encode("pw12345678"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));

            svc.deleteAccount("u1", "pw12345678");

            verify(refreshTokens).deleteByUserId("u1"); // sessions revoked first
            verify(users).deleteById("u1");             // then the user (DB cascades children)
        }

        @Test
        void deletesOauthOnlyAccountWithoutCurrentPassword() {
            User oauth = user("u1", "a@b.com", null, UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(oauth));

            svc.deleteAccount("u1", null);

            verify(users).deleteById("u1");
        }

        @Test
        void rejectsWrongCurrentPasswordForLocalAccount() {
            User u = user("u1", "a@b.com", encoder.encode("pw12345678"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));

            expectStatus(HttpStatus.BAD_REQUEST, () -> svc.deleteAccount("u1", "wrong"));
            verify(users, never()).deleteById(any());
        }

        @Test
        void rejectsMissingCurrentForLocalAccount() {
            User u = user("u1", "a@b.com", encoder.encode("pw12345678"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));

            expectStatus(HttpStatus.BAD_REQUEST, () -> svc.deleteAccount("u1", null));
            verify(users, never()).deleteById(any());
        }

        @Test
        void throwsWhenAccountGone() {
            when(users.findById("missing")).thenReturn(Optional.empty());
            expectStatus(HttpStatus.UNAUTHORIZED, () -> svc.deleteAccount("missing", "x"));
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

    class RequestEmailChange {
        @Test
        void issuesTokenAndMailsNewAddressForLocalAccount() {
            User u = user("u1", "old@b.com", encoder.encode("pw12345678"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));
            when(users.existsByEmail("new@b.com")).thenReturn(false);
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());

            svc.requestEmailChange("u1", "pw12345678", "  New@B.com ");

            verify(emailChangeTokens).deleteByUserId("u1"); // one active per user
            ArgumentCaptor<EmailChangeToken> saved = ArgumentCaptor.forClass(EmailChangeToken.class);
            verify(emailChangeTokens).save(saved.capture());
            EmailChangeToken t = saved.getValue();
            assertThat(t.getNewEmail()).isEqualTo("new@b.com"); // lowercased + trimmed
            assertThat(t.getUserId()).isEqualTo("u1");
            assertThat(t.isUsed()).isFalse();
            assertThat(t.getExpiresAt()).isAfter(Instant.now());

            ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
            verify(mail).sendEmailChangeVerification(eq("new@b.com"), link.capture());
            assertThat(link.getValue()).contains(t.getToken());
            assertThat(link.getValue()).contains("/#/account/verify-email?token=");
        }

        @Test
        void oauthOnlyAccountNeedsNoCurrentPassword() {
            User oauth = user("u1", "old@b.com", null, UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(oauth));
            when(users.existsByEmail("new@b.com")).thenReturn(false);
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());

            svc.requestEmailChange("u1", null, "new@b.com");

            verify(emailChangeTokens).save(any(EmailChangeToken.class));
            verify(mail).sendEmailChangeVerification(eq("new@b.com"), anyString());
        }

        @Test
        void rejectsWrongCurrentPasswordForLocalAccount() {
            User u = user("u1", "old@b.com", encoder.encode("pw12345678"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));

            expectStatus(HttpStatus.BAD_REQUEST,
                    () -> svc.requestEmailChange("u1", "wrong", "new@b.com"));
            verify(emailChangeTokens, never()).save(any());
            verify(mail, never()).sendEmailChangeVerification(any(), any());
        }

        @Test
        void rejectsAlreadyTakenEmail() {
            User u = user("u1", "old@b.com", encoder.encode("pw12345678"), UserRole.CLIENT);
            when(users.findById("u1")).thenReturn(Optional.of(u));
            when(users.existsByEmail("taken@b.com")).thenReturn(true);

            expectStatus(HttpStatus.CONFLICT,
                    () -> svc.requestEmailChange("u1", "pw12345678", "taken@b.com"));
            verify(emailChangeTokens, never()).save(any());
        }

        @Test
        void exposesPendingStateInUserView() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "old@b.com", "x", UserRole.CLIENT)));
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());
            when(emailChangeTokens.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc("u1"))
                    .thenReturn(Optional.of(changeToken("tk", "u1", "new@b.com", false,
                            Instant.now().plusSeconds(3600))));

            AuthUserDto dto = svc.me("u1");
            assertThat(dto.pendingEmail()).isEqualTo("new@b.com");
            assertThat(dto.emailChangeStatus()).isEqualTo("pending");
        }

        @Test
        void exposesExpiredStateInUserView() {
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "old@b.com", "x", UserRole.CLIENT)));
            when(profiles.findByUserId("u1")).thenReturn(Optional.empty());
            when(emailChangeTokens.findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc("u1"))
                    .thenReturn(Optional.of(changeToken("tk", "u1", "new@b.com", false,
                            Instant.now().minusSeconds(60))));

            AuthUserDto dto = svc.me("u1");
            assertThat(dto.emailChangeStatus()).isEqualTo("expired");
        }
    }

    @Nested
    class VerifyEmailChange {
        @Test
        void swapsEmailMarksUsedAndRevokesSessions() {
            EmailChangeToken t = changeToken("tk", "u1", "new@b.com", false,
                    Instant.now().plusSeconds(3600));
            User u = user("u1", "old@b.com", "x", UserRole.CLIENT);
            when(emailChangeTokens.findById("tk")).thenReturn(Optional.of(t));
            when(users.findById("u1")).thenReturn(Optional.of(u));
            when(users.existsByEmail("new@b.com")).thenReturn(false);

            svc.verifyEmailChange("tk");

            assertThat(u.getEmail()).isEqualTo("new@b.com");
            assertThat(t.isUsed()).isTrue();
            verify(refreshTokens).deleteByUserId("u1"); // all sessions revoked
        }

        @Test
        void rejectsUnknownToken() {
            when(emailChangeTokens.findById("nope")).thenReturn(Optional.empty());
            expectStatus(HttpStatus.BAD_REQUEST, () -> svc.verifyEmailChange("nope"));
        }

        @Test
        void rejectsUsedToken() {
            when(emailChangeTokens.findById("tk")).thenReturn(Optional.of(
                    changeToken("tk", "u1", "new@b.com", true, Instant.now().plusSeconds(3600))));
            expectStatus(HttpStatus.BAD_REQUEST, () -> svc.verifyEmailChange("tk"));
            verify(users, never()).save(any());
        }

        @Test
        void rejectsExpiredToken() {
            when(emailChangeTokens.findById("tk")).thenReturn(Optional.of(
                    changeToken("tk", "u1", "new@b.com", false, Instant.now().minusSeconds(60))));
            expectStatus(HttpStatus.BAD_REQUEST, () -> svc.verifyEmailChange("tk"));
        }

        @Test
        void rejectsWhenNewEmailTakenSinceRequest() {
            when(emailChangeTokens.findById("tk")).thenReturn(Optional.of(
                    changeToken("tk", "u1", "new@b.com", false, Instant.now().plusSeconds(3600))));
            when(users.findById("u1")).thenReturn(Optional.of(
                    user("u1", "old@b.com", "x", UserRole.CLIENT)));
            when(users.existsByEmail("new@b.com")).thenReturn(true);

            expectStatus(HttpStatus.CONFLICT, () -> svc.verifyEmailChange("tk"));
        }
    }

    private static EmailChangeToken changeToken(String token, String userId, String newEmail,
                                                boolean used, Instant expiresAt) {
        EmailChangeToken t = new EmailChangeToken();
        t.setToken(token);
        t.setUserId(userId);
        t.setNewEmail(newEmail);
        t.setUsed(used);
        t.setExpiresAt(expiresAt);
        return t;
    }

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
