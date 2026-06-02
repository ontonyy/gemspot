/* collector's stamp — the single save metaphor. Accent = --stamp, saves only. */
interface SaveButtonProps {
  saved?: boolean
  light?: boolean
  onClick?: () => void
}

export function SaveButton({ saved, light, onClick }: SaveButtonProps) {
  return (
    <button
      className="fg-stamp"
      data-saved={saved}
      data-light={light}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      aria-label={saved ? 'Collected' : 'Save spot'}
      title={saved ? 'Collected' : 'Save'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.6L6 21z" />
      </svg>
    </button>
  )
}
