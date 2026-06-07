/* Cold-start warmup. Render's free tier sleeps after ~15 min idle and takes
   ~50s to wake. Fire a GET /health on app boot so the dyno is waking while the
   user reads the landing — the first real data fetch then lands on a warm
   server. Fire-and-forget: the result is ignored, errors swallowed. No-op when
   running on the mock (VITE_API_URL unset). */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function warmupBackend(): void {
  if (!BASE) return
  void fetch(`${BASE}/health`).catch(() => {})
}
