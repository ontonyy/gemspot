import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Button } from '../shared/ui/Button'
import { Avatar } from '../shared/ui/Avatar'
import { AvatarPreview } from '../shared/ui/AvatarPreview'
import { useAuthStore } from '../shared/store/authStore'
import { useToastStore } from '../shared/store/toastStore'
import { avatarFor } from '../shared/lib/avatar'

/* Account settings — three sections: Profile (live this block), Security and
   Connected (stubs, filled in later blocks). Profile edits go through the
   authStore actions (PATCH /auth/me, multipart /uploads), which refresh the
   stored user so the topbar/menu avatar update live. Guests are bounced to
   /auth. Audit-hint metadata is rendered from the AuthUser DTO state. */

const NAME_MAX = 60
const PW_MIN = 8

function memberSince(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

// "expires in 23h" / "in 45m" audit hint for the pending email change.
function expiresInHint(iso?: string | null): string | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms) || ms <= 0) return null
  const mins = Math.round(ms / 60000)
  return mins >= 60 ? `expires in ${Math.round(mins / 60)}h` : `expires in ${mins}m`
}

export default function Account() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const busy = useAuthStore((s) => s.busy)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar)
  const changePassword = useAuthStore((s) => s.changePassword)
  const logoutAll = useAuthStore((s) => s.logoutAll)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const showToast = useToastStore((s) => s.show)

  const [name, setName] = useState(user?.name ?? '')
  const [previewing, setPreviewing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Security form state.
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // Email-change form state.
  const requestEmailChange = useAuthStore((s) => s.requestEmailChange)
  const [newEmail, setNewEmail] = useState('')
  const [emailPw, setEmailPw] = useState('')

  // Delete-account (danger zone) state.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')

  // Guard: signed-out users have no account to manage.
  useEffect(() => {
    if (!user) navigate('/auth', { replace: true, state: { from: '/account' } })
  }, [user, navigate])

  // Keep the field in sync if the user is refreshed elsewhere (e.g. bootstrap).
  useEffect(() => {
    setName(user?.name ?? '')
  }, [user?.name])

  if (!user) return null

  const dirty = (name.trim() || null) !== (user.name ?? null)
  const since = memberSince(user.createdAt)

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile({ name: name.trim() || null })
      showToast('Profile updated')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update profile')
    }
  }

  const pickFile = () => fileRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      await uploadAvatar(file)
      showToast('Avatar updated')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not upload avatar')
    }
  }

  const removeAvatar = async () => {
    try {
      await updateProfile({ avatarUrl: null })
      showToast('Avatar removed')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove avatar')
    }
  }

  const hasPassword = !!user.hasPassword
  const pwTooShort = newPw.length > 0 && newPw.length < PW_MIN
  const pwMismatch = confirmPw.length > 0 && newPw !== confirmPw
  const pwValid =
    newPw.length >= PW_MIN && newPw === confirmPw && (!hasPassword || curPw.length > 0)

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!pwValid) return
    try {
      await changePassword({
        currentPassword: hasPassword ? curPw : undefined,
        newPassword: newPw,
      })
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
      showToast(hasPassword ? 'Password changed' : 'Password set')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update password')
    }
  }

  const emailOk = /^\S+@\S+\.\S+$/.test(newEmail.trim())
  const emailValid =
    emailOk && newEmail.trim().toLowerCase() !== user.email.toLowerCase() && (!hasPassword || emailPw.length > 0)

  const requestEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailValid) return
    try {
      await requestEmailChange({
        newEmail: newEmail.trim(),
        currentPassword: hasPassword ? emailPw : undefined,
      })
      setNewEmail('')
      setEmailPw('')
      showToast('Verification email sent — check your new inbox')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not request email change')
    }
  }

  const confirmDelete = async () => {
    if (hasPassword && deletePw.length === 0) return
    try {
      await deleteAccount({ currentPassword: hasPassword ? deletePw : undefined })
      showToast('Your account has been deleted')
      navigate('/auth', { replace: true })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete account')
    }
  }

  const signOutEverywhere = async () => {
    try {
      await logoutAll()
      showToast('Signed out everywhere')
      navigate('/auth', { replace: true })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not sign out everywhere')
    }
  }

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in" style={{ maxWidth: 640 }}>
          <div className="fg-page-h">
            <div>
              <span className="kicker">Account</span>
              <h1>Settings</h1>
            </div>
          </div>

          {/* ===== Profile ===== */}
          <section className="fg-acct-sec">
            <h2>Profile</h2>

            <div className="fg-acct-avatar-row">
              <Avatar
                {...avatarFor(user)}
                onClick={() => user.avatarUrl && setPreviewing(true)}
                aria-label={user.avatarUrl ? 'View profile photo' : undefined}
              />
              <div className="fg-acct-avatar-btns">
                <Button onClick={pickFile} disabled={busy}>Upload photo</Button>
                {user.avatarUrl && (
                  <Button onClick={removeAvatar} disabled={busy}>Remove</Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={onFile}
                />
              </div>
            </div>

            <form className="fg-form" onSubmit={saveName} noValidate>
              <div className="fg-field">
                <label htmlFor="acct-name">Display name</label>
                <input
                  id="acct-name"
                  type="text"
                  value={name}
                  maxLength={NAME_MAX}
                  autoComplete="name"
                  placeholder="Your name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="fg-form-actions">
                <Button variant="solid" type="submit" disabled={busy || !dirty}>Save changes</Button>
              </div>
            </form>

            {since && <div className="fg-acct-meta">Member since {since}</div>}
          </section>

          {/* ===== Security ===== */}
          <section className="fg-acct-sec">
            <h2>Security</h2>

            {!hasPassword && (
              <div className="fg-acct-warn">
                OAuth-only account: no local password set. Add one so you can still
                sign in (and recover your account) if provider sign-in is unavailable.
              </div>
            )}

            <form className="fg-form" onSubmit={savePassword} noValidate>
              {hasPassword && (
                <div className="fg-field">
                  <label htmlFor="acct-cur-pw">Current password</label>
                  <input
                    id="acct-cur-pw"
                    type="password"
                    value={curPw}
                    autoComplete="current-password"
                    onChange={(e) => setCurPw(e.target.value)}
                  />
                </div>
              )}
              <div className="fg-field">
                <label htmlFor="acct-new-pw">{hasPassword ? 'New password' : 'Password'}</label>
                <input
                  id="acct-new-pw"
                  type="password"
                  value={newPw}
                  autoComplete="new-password"
                  placeholder={`At least ${PW_MIN} characters`}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                {pwTooShort && <span className="fg-field-err">Use at least {PW_MIN} characters.</span>}
              </div>
              <div className="fg-field">
                <label htmlFor="acct-confirm-pw">Confirm password</label>
                <input
                  id="acct-confirm-pw"
                  type="password"
                  value={confirmPw}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
                {pwMismatch && <span className="fg-field-err">Passwords do not match.</span>}
              </div>
              <div className="fg-form-actions">
                <Button variant="solid" type="submit" disabled={busy || !pwValid}>
                  {hasPassword ? 'Change password' : 'Set a password'}
                </Button>
              </div>
            </form>

            {hasPassword && (
              <div className="fg-acct-meta">
                Changing your password signs out your other devices. This device stays signed in.
              </div>
            )}

            <div className="fg-acct-divider" />

            {/* Email change (verified) */}
            <h3 className="fg-acct-subh">Email</h3>
            <div className="fg-acct-meta">Current email: <strong>{user.email}</strong></div>

            {user.emailChangeStatus === 'pending' && user.pendingEmail && (
              <div className="fg-acct-warn">
                Pending verification: <strong>{user.pendingEmail}</strong>
                {expiresInHint(user.pendingExpiresAt) ? ` — ${expiresInHint(user.pendingExpiresAt)}` : ''}.
                Open the link we emailed to that address to finish the change.
              </div>
            )}
            {user.emailChangeStatus === 'expired' && (
              <div className="fg-acct-meta">
                A previous email-change request expired. Request a new one below.
              </div>
            )}

            <form className="fg-form" onSubmit={requestEmail} noValidate>
              <div className="fg-field">
                <label htmlFor="acct-new-email">New email</label>
                <input
                  id="acct-new-email"
                  type="email"
                  value={newEmail}
                  autoComplete="email"
                  placeholder="you@example.com"
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                {newEmail.length > 0 && !emailOk && (
                  <span className="fg-field-err">Enter a valid email address.</span>
                )}
              </div>
              {hasPassword && (
                <div className="fg-field">
                  <label htmlFor="acct-email-pw">Current password</label>
                  <input
                    id="acct-email-pw"
                    type="password"
                    value={emailPw}
                    autoComplete="current-password"
                    onChange={(e) => setEmailPw(e.target.value)}
                  />
                </div>
              )}
              <div className="fg-form-actions">
                <Button variant="solid" type="submit" disabled={busy || !emailValid}>
                  Send verification link
                </Button>
              </div>
            </form>
            <div className="fg-acct-meta">
              We email a confirmation link to the new address. Your email changes only after you
              open it; verifying signs you out of all devices.
            </div>

            <div className="fg-acct-divider" />
            <div className="fg-acct-meta">Sign out of all devices, including this one.</div>
            <div className="fg-form-actions">
              <Button onClick={signOutEverywhere} disabled={busy}>Sign out everywhere</Button>
            </div>
          </section>

          {/* ===== Connected accounts (read-only status + recovery warning) ===== */}
          <section className="fg-acct-sec">
            <h2>Connected accounts</h2>

            {/* OAuth-only accounts have no local password = no recovery path if the
               provider is ever unavailable. Surface it as a warning state. */}
            {!hasPassword && (
              <div className="fg-acct-warn">
                This account signs in with {user.provider ?? 'a provider'} only — no local
                password is set. Without one you can't recover access if provider sign-in is
                unavailable. Add a password in <strong>Security</strong> above.
              </div>
            )}

            {(['google', 'facebook'] as const).map((p) => {
              const linked = user.provider === p
              const label = p === 'google' ? 'Google' : 'Facebook'
              return (
                <div key={p} className="fg-acct-conn-row">
                  <span>{label}</span>
                  <span className="fg-acct-meta">{linked ? 'Connected' : 'Not connected'}</span>
                </div>
              )
            })}
            <div className="fg-acct-conn-row">
              <span>Local password</span>
              <span className="fg-acct-meta">{hasPassword ? 'Set' : 'Not set'}</span>
            </div>

            <div className="fg-acct-meta">
              Linking and unlinking providers arrives in a later update.
            </div>
          </section>

          {/* ===== Preferences (placeholder — wired when those features land) ===== */}
          <section className="fg-acct-sec">
            <h2>Preferences</h2>
            <div className="fg-acct-meta">
              Timezone, language, and notification preferences are coming soon.
            </div>
          </section>

          {/* ===== Danger zone — permanent account deletion ===== */}
          <section className="fg-acct-sec">
            <h2>Danger zone</h2>
            <div className="fg-acct-meta">
              Deleting your account is permanent. Your profile, saved places, and sessions are
              removed; this can't be undone.
            </div>

            {!confirmingDelete ? (
              <div className="fg-form-actions">
                <Button onClick={() => setConfirmingDelete(true)} disabled={busy}>
                  Delete account
                </Button>
              </div>
            ) : (
              <div className="fg-form">
                {hasPassword && (
                  <div className="fg-field">
                    <label htmlFor="acct-del-pw">Confirm with your password</label>
                    <input
                      id="acct-del-pw"
                      type="password"
                      value={deletePw}
                      autoComplete="current-password"
                      onChange={(e) => setDeletePw(e.target.value)}
                    />
                  </div>
                )}
                <div className="fg-form-actions">
                  <Button
                    variant="solid"
                    onClick={confirmDelete}
                    disabled={busy || (hasPassword && deletePw.length === 0)}
                  >
                    Permanently delete
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmingDelete(false)
                      setDeletePw('')
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {previewing && user.avatarUrl && (
        <AvatarPreview
          src={user.avatarUrl}
          alt={user.name ?? 'Profile photo'}
          onClose={() => setPreviewing(false)}
        />
      )}
    </AppShell>
  )
}
