/* Loads the signed-in user's server-backed PENDING submissions + OPEN reports
   into their stores so they survive reload (the moderation queue is the server's,
   not session state). Called on boot (after auth refresh) and after sign-in;
   cleared on sign-out. No-op for guests / mock backend (returns empty). */

import { placesApi } from './placesApi'
import { useAuthStore } from '../store/authStore'
import { useSubmissionsStore } from '../store/submissionsStore'
import { useReportsStore } from '../store/reportsStore'

export async function hydrateMine(): Promise<void> {
  if (!useAuthStore.getState().user) return
  try {
    const [subs, reports] = await Promise.all([
      placesApi.getMySubmissions(),
      placesApi.getMyReports(),
    ])
    useSubmissionsStore.getState().set(subs)
    useReportsStore.getState().set(reports)
  } catch {
    /* non-fatal — keep whatever is already in the stores */
  }
}

export function clearMine(): void {
  useSubmissionsStore.getState().set([])
  useReportsStore.getState().set([])
}
