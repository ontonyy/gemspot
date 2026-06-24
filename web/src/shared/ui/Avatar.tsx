import { useState, type ButtonHTMLAttributes } from 'react'

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string
  /** Uploaded image URL. Falls back to initials when absent or it fails to load. */
  src?: string
  on?: boolean
  small?: boolean
}

export function Avatar({ initials, src, on, small, className = '', ...rest }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const cls = ['fg-avatar', small && 'fg-avatar-sm', className].filter(Boolean).join(' ')
  const showImg = src && !broken
  return (
    <button className={cls} data-on={on} {...rest}>
      {showImg ? (
        <img className="fg-avatar-img" src={src} alt="" onError={() => setBroken(true)} />
      ) : (
        initials
      )}
    </button>
  )
}
