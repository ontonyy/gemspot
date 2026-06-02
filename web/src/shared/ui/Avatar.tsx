import type { ButtonHTMLAttributes } from 'react'

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string
  on?: boolean
  small?: boolean
}

export function Avatar({ initials, on, small, className = '', ...rest }: AvatarProps) {
  const cls = ['fg-avatar', small && 'fg-avatar-sm', className].filter(Boolean).join(' ')
  return <button className={cls} data-on={on} {...rest}>{initials}</button>
}
