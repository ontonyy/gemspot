/* Analytics seam. Fire-and-forget: never blocks UX, never throws into call
   sites. POSTs to the backend /events when VITE_API_URL is set; otherwise a
   no-op debug log so `npm run dev` against the mock stays silent-safe.
   Event names are fired from save/share/directions/pin/filter/submission. */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export type EventName =
  | 'save' | 'share' | 'directions' | 'pin' | 'filter' | 'submission'

export function track(
  name: EventName,
  props?: Record<string, unknown>,
  placeId?: string,
): void {
  if (!BASE) {
    if (import.meta.env.DEV) console.debug('[track]', name, props ?? {}, placeId ?? '')
    return
  }
  // fire-and-forget; swallow errors (analytics must never break the app)
  void fetch(`${BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, props, placeId }),
    keepalive: true,
  }).catch(() => undefined)
}
