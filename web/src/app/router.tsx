import { createBrowserRouter, Navigate } from 'react-router-dom'
import Explore from '../pages/Explore'

/* Data router. Explore is URL-driven (?cat=). Root redirects to /explore;
   Saved/Guides/Add deferred to later blocks. */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/explore" replace /> },
  { path: '/explore', element: <Explore /> },
  // detail opens as a panel over Explore; cold-loads as a full page (Explore renders behind)
  { path: '/spot/:slug', element: <Explore /> },
  { path: '*', element: <Navigate to="/explore" replace /> },
])
