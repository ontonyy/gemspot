package ee.gemspot.api.web;

import ee.gemspot.api.common.CurrentUser;
import ee.gemspot.api.dto.AuthResponseDto;
import ee.gemspot.api.dto.AuthUserDto;
import ee.gemspot.api.dto.GoogleOAuthDto;
import ee.gemspot.api.dto.LoginDto;
import ee.gemspot.api.dto.OkDto;
import ee.gemspot.api.dto.RefreshDto;
import ee.gemspot.api.dto.RegisterDto;
import ee.gemspot.api.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Dual-token JWT auth. Status codes match Nest 1:1: register 201,
 *  login/refresh/oauth/logout 200. */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponseDto register(@Valid @RequestBody RegisterDto input) {
        return auth.register(input.email(), input.password(), input.name());
    }

    @PostMapping("/login")
    public AuthResponseDto login(@Valid @RequestBody LoginDto input) {
        return auth.login(input.email(), input.password());
    }

    @PostMapping("/refresh")
    public AuthResponseDto refresh(@Valid @RequestBody RefreshDto input) {
        return auth.refresh(input.refreshToken());
    }

    @PostMapping("/oauth/google")
    public AuthResponseDto oauthGoogle(@Valid @RequestBody GoogleOAuthDto input) {
        return auth.oauthGoogle(input.idToken());
    }

    // Stateless logout — SPA discards tokens. Parity endpoint.
    @PostMapping("/logout")
    public OkDto logout() {
        return new OkDto(true);
    }

    @GetMapping("/me")
    public AuthUserDto me() {
        return auth.me(CurrentUser.id());
    }
}
