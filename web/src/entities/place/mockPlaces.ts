import type { PlaceCard } from './model'

/* card-shape sample specimens (ported from fg-data.jsx FG_PLACES) + 2 new
   categories (tennis, padel) to exercise the launch taxonomy. Demo only —
   full typed placesApi seam lands in a later block. */
export const MOCK_PLACES: PlaceCard[] = [
  { id: 1, no: '01', name: 'Politseiaia ping-pong', cat: 'tabletennis', area: 'Kesklinn', km: 0.4, saves: 38, tags: ['Free', 'Concrete', 'Lit'] },
  { id: 2, no: '02', name: 'Kanuti aed blossoms', cat: 'sakura', area: 'Kesklinn', km: 0.5, saves: 96, tags: ['Seasonal', 'Late Apr'] },
  { id: 3, no: '03', name: 'Patkuli viewpoint', cat: 'scenic', area: 'Toompea', km: 0.7, saves: 142, tags: ['Free', 'Sunset', 'Rooftops'] },
  { id: 4, no: '04', name: 'Politseipark hoops', cat: 'basketball', area: 'Kesklinn', km: 0.8, saves: 21, tags: ['Free', 'Full court'] },
  { id: 5, no: '05', name: 'Kadrioru tennis courts', cat: 'tennis', area: 'Kadriorg', km: 1.2, saves: 44, tags: ['Hard court', 'Lit'] },
  { id: 6, no: '06', name: 'Löwenruh pitch', cat: 'football', area: 'Kristiine', km: 2.3, saves: 34, tags: ['Free', 'Grass'] },
  { id: 7, no: '07', name: 'Snelli pond tables', cat: 'tabletennis', area: 'Kesklinn', km: 0.9, saves: 52, tags: ['Free', 'Shaded'] },
  { id: 8, no: '08', name: 'Pirita padel club', cat: 'padel', area: 'Pirita', km: 5.4, saves: 27, tags: ['Booking', 'Indoor'] },
  { id: 9, no: '09', name: 'Lasnamäe cliff view', cat: 'scenic', area: 'Lasnamäe', km: 4.1, saves: 67, tags: ['Free', 'Industrial'] },
  { id: 10, no: '10', name: 'Tammsaare cherries', cat: 'sakura', area: 'Kesklinn', km: 0.3, saves: 113, tags: ['Seasonal', 'Late Apr', 'Central'] },
]
