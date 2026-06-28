import { useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string
  /** Uploaded image URL. Falls back to initials when absent or it fails to load. */
  src?: string
  on?: boolean
  small?: boolean
}

export function Avatar({ initials, src, on, small, className = '', onClick, ...rest }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const cls = ['fg-avatar', small && 'fg-avatar-sm', className].filter(Boolean).join(' ')
  const showImg = src && !broken
  const handleClick = showImg
    ? (e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        window.open(src, '_blank', 'noopener')
      }
    : onClick
  return (
    <button className={cls} data-on={on} onClick={handleClick} {...rest}>
      {showImg ? (
        <img className="fg-avatar-img" src={src} alt="" onError={() => setBroken(true)} />
      ) : (
        initials
      )}
    </button>
  )
}
