import { createHashRouter, Navigate } from 'react-router-dom'
import Explore from '../pages/Explore'
import Saved from '../pages/Saved'
import Guides from '../pages/Guides'
import GuideDetail from '../pages/GuideDetail'
import AddSpot from '../pages/AddSpot'
import Auth from '../pages/Auth'

/* Data router. Explore is URL-driven (?cat=). Root redirects to /explore.
   Saved/Guides/Add are full screens sharing the AppShell chrome. */
export const router = createHashRouter([
  { path: '/', element: <Navigate to="/explore" replace /> },
  { path: '/explore', element: <Explore /> },
  // detail opens as a panel over Explore; cold-loads as a full page (Explore renders behind)
  { path: '/spot/:slug', element: <Explore /> },
  { path: '/saved', element: <Saved /> },
  { path: '/guides', element: <Guides /> },
  { path: '/guides/:id', element: <GuideDetail /> },
  { path: '/add', element: <AddSpot /> },
  { path: '/auth', element: <Auth /> },
  { path: '*', element: <Navigate to="/explore" replace /> },
])
