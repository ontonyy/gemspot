import { useEffect } from 'react'

const BASE = 'GemSpot'

/* Route-aware document title: "Explore · GemSpot", "<Spot name> · GemSpot".
   Pass '' for the bare app name (Home), undefined/null while data is still
   loading to leave the current title alone. Restores the previous title on
   unmount so overlay panels (SpotDetail over Explore) hand it back. */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (title === undefined || title === null) return
    const prev = document.title
    document.title = title ? `${title} · ${BASE}` : BASE
    return () => { document.title = prev }
  }, [title])
}
