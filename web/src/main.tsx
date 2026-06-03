import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import './shared/styles/fonts'
import './shared/styles/tokens.css'
import './shared/styles/atoms.css'
import { queryClient } from './shared/api/queries'
import { router } from './app/router'
import { useAuthStore } from './shared/store/authStore'
import { hydrateMine } from './shared/api/hydrateMine'

// Trade any stored refresh token for a fresh session, then load the user's
// server-backed PENDING submissions / OPEN reports so they survive reload.
void useAuthStore.getState().bootstrap().then(hydrateMine)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
