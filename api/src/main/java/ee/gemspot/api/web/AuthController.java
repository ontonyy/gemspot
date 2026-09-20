package ee.gemspot.api.web;

import ee.gemspot.api.common.CurrentUser;
import ee.gemspot.api.dto.AuthResponseDto;
import ee.gemspot.api.dto.AuthUserDto;
import ee.gemspot.api.dto.ChangePasswordDto;
import ee.gemspot.api.dto.DeleteAccountDto;
import ee.gemspot.api.dto.EmailChangeRequestDto;
import ee.gemspot.api.dto.EmailVerifyDto;
import ee.gemspot.api.dto.FacebookOAuthDto;
import ee.gemspot.api.dto.GoogleOAuthDto;
import ee.gemspot.api.dto.LoginDto;
import ee.gemspot.api.dto.OkDto;
import ee.gemspot.api.dto.RegisterDto;
import ee.gemspot.api.dto.UpdateProfileDto;
import ee.gemspot.api.security.RefreshCookies;
import ee.gemspot.api.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Dual-token JWT auth. Status codes match Nest 1:1: register 201,
 *  login/refresh/oauth/logout 200.
 *
 *  <p>Plan 032 / ADR 0006: the refresh token travels as an HttpOnly cookie, not in
 *  the JSON body and not in the request body. Every session-minting response sets
 *  it via {@link RefreshCookies}; {@code /refresh} and {@code /logout} read and
 *  clear it, and pass the CSRF origin guard first because the cookie is ambient. */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService auth;
    private final RefreshCookies refreshCookies;

    public AuthController(AuthService auth, RefreshCookies refreshCookies) {
        this.auth = auth;
        this.refreshCookies = refreshCookies;
    }

    /** Hands the caller the session and the credential: body minus the refresh
     *  token (it is {@code @JsonIgnore}d), cookie carrying it. */
    private AuthResponseDto issue(AuthResponseDto session, HttpServletResponse response) {
        refreshCookies.issue(response, session.refreshToken());
        return session;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponseDto register(@Valid @RequestBody RegisterDto input, HttpServletResponse response) {
        return issue(auth.register(input.email(), input.password(), input.name()), response);
    }

    @PostMapping("/login")
    public AuthResponseDto login(@Valid @RequestBody LoginDto input, HttpServletResponse response) {
        return issue(auth.login(input.email(), input.password()), response);
    }

    @PostMapping("/refresh")
    public AuthResponseDto refresh(HttpServletRequest request, HttpServletResponse response) {
        refreshCookies.requireTrustedOrigin(request);
        String presented = refreshCookies.read(request)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        return issue(auth.refresh(presented), response);
    }

    @PostMapping("/oauth/google")
    public AuthResponseDto oauthGoogle(@Valid @RequestBody GoogleOAuthDto input, HttpServletResponse response) {
        return issue(auth.oauthGoogle(input.idToken()), response);
    }

    @PostMapping("/oauth/facebook")
    public AuthResponseDto oauthFacebook(@Valid @RequestBody FacebookOAuthDto input, HttpServletResponse response) {
        return issue(auth.oauthFacebook(input.accessToken()), response);
    }

    // Logout now has real work: the SPA cannot clear an HttpOnly cookie itself,
    // so only the server can end the session on this device.
    @PostMapping("/logout")
    public OkDto logout(HttpServletRequest request, HttpServletResponse response) {
        refreshCookies.requireTrustedOrigin(request);
        refreshCookies.clear(response);
        return new OkDto(true);
    }

    @GetMapping("/me")
    public AuthUserDto me() {
        return auth.me(CurrentUser.id());
    }

    @PatchMapping("/me")
    public AuthUserDto updateMe(@Valid @RequestBody UpdateProfileDto input) {
        return auth.updateProfile(CurrentUser.id(), input.name(), input.avatarUrl());
    }

    // Permanently delete the acting account (own endpoint). Re-auths local
    // accounts; cascades owned children at the DB. Irreversible.
    @DeleteMapping("/me")
    public OkDto deleteMe(@Valid @RequestBody DeleteAccountDto input) {
        auth.deleteAccount(CurrentUser.id(), input.currentPassword());
        return new OkDto(true);
    }

    // Set/change local password (own endpoint). Returns a fresh token pair for the
    // acting device; other devices' sessions are revoked.
    @PostMapping("/password")
    public AuthResponseDto changePassword(@Valid @RequestBody ChangePasswordDto input, HttpServletResponse response) {
        return issue(
                auth.changePassword(CurrentUser.id(), input.currentPassword(), input.newPassword()), response);
    }

    // Sign out everywhere — revoke all the user's refresh families.
    @PostMapping("/logout-all")
    public OkDto logoutAll() {
        auth.logoutAll(CurrentUser.id());
        return new OkDto(true);
    }

    // Request a verified email change (own endpoint). Re-auths, mails the new
    // address a verification link; returns the refreshed view with pending state.
    @PostMapping("/email/change-request")
    public AuthUserDto requestEmailChange(@Valid @RequestBody EmailChangeRequestDto input) {
        return auth.requestEmailChange(CurrentUser.id(), input.currentPassword(), input.newEmail());
    }

    // Consume an email-change token (public — token is the secret). Swaps the
    // email and revokes all sessions; the user re-authenticates with the new email.
    @PostMapping("/email/verify")
    public OkDto verifyEmailChange(@Valid @RequestBody EmailVerifyDto input) {
        auth.verifyEmailChange(input.token());
        return new OkDto(true);
    }
}
