import type { AuthUser } from '../api/authApi'

/* Single source of truth for the avatar shown in the topbar AND the account
   menu, so they can never diverge again (the old hardcoded "M" bug). Fallback
   priority: uploaded image → initials from name → initials from email →
   neutral guest marker. */

const GUEST_INITIALS = '·'

type AvatarUser = Pick<AuthUser, 'name' | 'email' | 'avatarUrl'> | null | undefined

/** Up to two uppercase initials from name, else first email char, else neutral. */
export function initialsFor(user: AvatarUser): string {
  if (!user) return GUEST_INITIALS
  const name = user.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const letters = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')
    if (letters) return letters.toUpperCase()
  }
  const email = user.email?.trim()
  if (email) return email[0].toUpperCase()
  return GUEST_INITIALS
}

/** Presentation for the Avatar component: image src (if uploaded) + initials fallback. */
export function avatarFor(user: AvatarUser): { src?: string; initials: string } {
  const src = user?.avatarUrl?.trim() || undefined
  return { src, initials: initialsFor(user) }
}
