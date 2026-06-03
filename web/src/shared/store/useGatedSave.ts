/* Save action gated behind auth. Guests are bounced to /auth (returned to the
   given origin); signed-in users toggle the save (which savedStore mirrors to the
   server) and get the confirmation toast. Shared by every save button. */

import { useNavigate } from 'react-router-dom'
import { useSavedStore } from './savedStore'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'
import { track } from '../api/track'

export function useGatedSave() {
  const navigate = useNavigate()
  const toggle = useSavedStore((s) => s.toggle)
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)

  return (id: string, from = '/explore') => {
    if (!user) {
      showToast('Sign in to save spots')
      navigate('/auth', { state: { from } })
      return
    }
    const nowSaved = toggle(id)
    if (nowSaved) track('save', undefined, id)
    showToast(nowSaved ? 'Saved to your collection' : 'Removed from collection')
  }
}
