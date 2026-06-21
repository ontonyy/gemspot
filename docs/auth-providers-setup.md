# Auth providers — human setup steps

What a human must do in external consoles. Code status noted per provider.

---

## 1. Google sign-in — CODE DONE, config only

Flow already implemented end to end:
- Frontend: `web/src/features/auth/GoogleButton.tsx` (reads `VITE_GOOGLE_CLIENT_ID`).
- Backend: `api/.../service/AuthService.java` `oauthGoogle()` (reads env `GOOGLE_CLIENT_ID`,
  verifies ID token at Google `tokeninfo`, checks `aud` + `email_verified`, links by email).

The button is disabled and shows "Google sign-in isn't configured in this build"
**only because the client ID env vars are unset.** No code change needed.

### Human steps (Google Cloud Console)

1. Go to https://console.cloud.google.com/ → create/select a project (e.g. "GemSpot").
2. **APIs & Services → OAuth consent screen**:
   - User type: External.
   - App name, support email, developer contact.
   - Scopes: `email`, `profile`, `openid` (default for OIDC — no extra review needed).
   - Add test users while in "Testing" status, OR click "Publish app" to go live
     (Google verification is light for these basic scopes).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins: add every origin the SPA runs on, e.g.
     - `http://localhost:5173` (vite dev)
     - `https://<prod-domain>`
   - Authorized redirect URIs: **not required** for Google Identity Services button
     (it uses the ID-token credential flow, not redirect). Leave empty unless added later.
   - Save → copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`).

### Wire it (the only config change)

Same Client ID in BOTH places — `aud` check in the backend requires an exact match:

- Frontend build env (web): `VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`
- Backend runtime env (api): `GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`

Note: `VITE_GOOGLE_CLIENT_ID` is missing from `web/.env.example` — add it there too
(documentation only).

### Verify

- `npm run dev` in `web/` with the var set → real Google button renders (not the disabled note).
- Sign in → backend exchanges the token at `POST /auth/oauth/google` → session issued.

---

## 2. Facebook login — CODE DONE, needs config + Meta review

Flow implemented end to end (mirrors Google):
- Frontend: `web/src/features/auth/FacebookButton.tsx` (reads `VITE_FACEBOOK_APP_ID`;
  unset → disabled "test mode" placeholder; set → loads FB JS SDK, `FB.login` with
  `email` scope, hands the access token to `onFacebook` in `web/src/pages/Auth.tsx`).
- Backend: `api/.../service/AuthService.java` `oauthFacebook()` + route
  `POST /auth/oauth/facebook` (reads env `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`,
  verifies the token at Graph `/debug_token` for `is_valid`+`app_id`, fetches
  `/me?fields=id,email,name`, requires email, links by email via
  `User.provider`/`providerId`). Covered by `AuthServiceTest.OauthFacebook`.

The button is the disabled placeholder **only because `VITE_FACEBOOK_APP_ID` is unset.**
No code change needed — set the env vars (B) and complete Meta App Review.

### A. Wire it (config only)

- Frontend build env (web): `VITE_FACEBOOK_APP_ID=<App ID>`
- Backend runtime env (api): `FACEBOOK_APP_ID=<App ID>` + `FACEBOOK_APP_SECRET=<App Secret>`
- App ID is the same value in web + backend; the secret is backend-only.

### B. Human steps (Meta for Developers)

1. https://developers.facebook.com/ → My Apps → Create App → type "Consumer".
2. Add product **Facebook Login → Web**. Set Site URL / valid OAuth redirect URIs.
3. App settings → Basic: copy **App ID** + **App Secret**.
4. **App review** for the `email` permission:
   - While the app is in **Development/Test mode**, only listed roles
     (Admins/Developers/Testers under App Roles) can log in — this is exactly the
     "test mode" the UI message refers to.
   - To allow the public: complete Business Verification + submit `email` (and
     `public_profile`) for App Review with a screencast of the login flow, privacy
     policy URL, and data-use justification. Approval is required before switching
     the app to **Live**.
5. After approval → toggle app to **Live**, set the prod env vars. No code change —
   setting `VITE_FACEBOOK_APP_ID` swaps the placeholder for the real button.

> Until Meta approves and the app is Live, keep the button disabled or restrict to
> whitelisted testers. Do not promise public Facebook login before review passes.

---

## Summary

| Provider | Code | External action | Blocker |
|----------|------|-----------------|---------|
| Google   | done | Create OAuth client ID, set 2 env vars | none — ship today |
| Facebook | done | Set 3 env vars + Meta App Review for `email` | Meta review gate |
