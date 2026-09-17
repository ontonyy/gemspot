/* The seam under test is SpotDetail's usePlace guard. Before plan 022 the panel
   rendered `isLoading || !p` as one branch, so a failed query (isLoading false,
   data undefined) left the skeleton shimmering forever. These cases pin the three
   outcomes: loading → skeleton, resolved → the spot, errored → error copy and no
   skeleton.

   usePlace is stubbed at the module seam via vi.mock so no QueryClient is needed;
   the panel still needs a Router because it calls useNavigate. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import { SpotDetail } from './SpotDetail'
import { usePlace } from '../../shared/api/queries'
import type { PlaceDetailDto } from '../../shared/api/types'

vi.mock('../../shared/api/queries', () => ({ usePlace: vi.fn() }))

const PLACE = {
  id: 'p-1',
  slug: 'kalamaja-court',
  name: 'Kalamaja Court',
  category: { id: 'basketball', label: 'Basketball', short: 'BBALL', color: '#f60', glyph: 'ball' },
  neighborhood: 'Kalamaja',
  savesCount: 12,
  isFree: true,
  tags: [],
  lat: 59.44,
  lng: 24.73,
  note: 'Quiet mornings.',
  photos: [],
  viewsCount: 3,
  sharesCount: 1,
  contributor: { name: 'Anon' },
  fieldNotes: { access: 'Open', lit: 'Yes', best: 'Morning' },
  appleMapsUrl: 'https://maps.apple.com/?q=1',
  googleMapsUrl: 'https://maps.google.com/?q=1',
} as unknown as PlaceDetailDto

/** Only the three fields SpotDetail reads off the query result. */
const queryResult = (r: Partial<UseQueryResult<PlaceDetailDto, Error>>) =>
  vi.mocked(usePlace).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...r,
  } as UseQueryResult<PlaceDetailDto, Error>)

const renderPanel = () =>
  render(
    <MemoryRouter>
      <SpotDetail slug="kalamaja-court" onClose={vi.fn()} />
    </MemoryRouter>,
  )

describe('<SpotDetail />', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the skeleton while the query is loading', () => {
    queryResult({ isLoading: true })

    const { container } = renderPanel()

    expect(container.querySelector('.fg-skel')).not.toBeNull()
    expect(screen.queryByText("Couldn't load this spot.")).not.toBeInTheDocument()
  })

  it('renders the spot once the query resolves', () => {
    queryResult({ data: PLACE })

    renderPanel()

    expect(screen.getByRole('heading', { name: 'Kalamaja Court' })).toBeInTheDocument()
  })

  it('renders error copy instead of an endless skeleton when the query fails', () => {
    queryResult({ error: new Error('boom') })

    const { container } = renderPanel()

    expect(screen.getByText("Couldn't load this spot.")).toBeInTheDocument()
    expect(container.querySelector('.fg-skel')).toBeNull()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })
})
