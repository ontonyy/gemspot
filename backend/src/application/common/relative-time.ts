/* Human-relative label matching the mock's "just now" style, used for the
   submittedAt/reportedAt strings the SPA renders. Keeps the DTO contract
   (a relative string, not an ISO timestamp). */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const sec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}
