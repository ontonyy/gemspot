/* Saved/bookmarked places — single "save" metaphor (no hearts/ratings).
   Set of place ids, persisted to localStorage so guest saves survive reloads.
   When signed in, the same set is mirrored to the server (saved_places) so saves
   sync cross-device; on login the guest set is merged in (see AuthPage). Local
   state stays the source of truth for instant UI; the server call is an optimistic
   update — only the newest in-flight toggle may reconcile the set from its
   response (a late reply must not resurrect a stale set), and a failure rolls the
   optimistic change back and says so. */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../api/authApi";
import { useAuthStore } from "./authStore";
import { useToastStore } from "./toastStore";

interface SavedState {
  ids: string[];
  isSaved: (id: string) => boolean;
  toggle: (id: string) => boolean; // returns new saved state
  replace: (ids: string[]) => void; // after login merge / server reconcile
}

// ponytail: one counter for all ids — each response carries the full server set,
// so newest-wins is correct set-wide. Per-id tickets only if the API goes deltas.
let syncSeq = 0;

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      ids: [],
      isSaved: (id) => get().ids.includes(id),
      toggle: (id) => {
        const has = get().ids.includes(id);
        const before = get().ids;
        set({ ids: has ? before.filter((x) => x !== id) : [...before, id] });
        const token = useAuthStore.getState().accessToken;
        if (token) {
          const mine = ++syncSeq;
          const op = has
            ? authApi.removeSaved(token, id)
            : authApi.addSaved(token, id);
          op.then((serverIds) => {
            if (mine === syncSeq) set({ ids: serverIds });
          }).catch(() => {
            if (mine !== syncSeq) return;
            set({ ids: before });
            useToastStore
              .getState()
              .show(
                has
                  ? "Couldn't remove that spot — please try again"
                  : "Couldn't save that spot — please try again",
              );
          });
        }
        return !has;
      },
      replace: (ids) => set({ ids }),
    }),
    { name: "gemspot.saved" },
  ),
);
