import { useEffect } from 'react'
import { Icon, Ic } from './Icon'

/* Full-size profile-photo popup. Mirrors ReportModal's scrim + bordered card +
   hard shadow so it matches the rest of the app. Scrim-click and Esc close.
   Opt-in: only the Account settings avatar opens this (topbar/menu stay plain). */
interface AvatarPreviewProps {
  src: string
  alt?: string
  onClose: () => void
}

export function AvatarPreview({ src, alt = '', onClose }: AvatarPreviewProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fg-modal-scrim" onClick={onClose} />
      <div className="fg-avatar-modal" role="dialog" aria-modal="true" aria-label="Profile photo">
        <button className="fg-iconbtn fg-avatar-modal-x" onClick={onClose} aria-label="Close">
          <Icon d={Ic.x} size={16} />
        </button>
        <img className="fg-avatar-modal-img" src={src} alt={alt} />
      </div>
    </>
  )
}
