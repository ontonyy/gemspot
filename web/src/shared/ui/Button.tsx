import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'outline' | 'solid'
  size?: 'md' | 'lg'
  block?: boolean
  children?: ReactNode
}

export function Button({ variant = 'outline', size = 'md', block, className = '', children, ...rest }: ButtonProps) {
  const cls = [
    'fg-btn',
    variant === 'solid' && 'fg-btn-solid',
    size === 'lg' && 'fg-btn-lg',
    block && 'fg-btn-block',
    className,
  ].filter(Boolean).join(' ')
  return <button className={cls} {...rest}>{children}</button>
}
