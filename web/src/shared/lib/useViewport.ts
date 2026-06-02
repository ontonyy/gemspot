/* Mobile/desktop switch for Explore. <980px = mobile (matches fg.css breakpoint
   + Block 5.2). Listens to resize; SSR-safe default = desktop. */

import { useEffect, useState } from 'react'

export const MOBILE_MAX = 980

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < MOBILE_MAX,
  )
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < MOBILE_MAX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return mobile
}
