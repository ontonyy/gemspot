/* Map markers are rendered into a maplibre Marker host element that carries the
   click listener (see updateMarkers). The pin/pill themselves used to be divs:
   not tabbable, deaf to Enter/Space. These tests render them inside a stand-in
   host with a click spy — the same wiring the map uses — and drive the keyboard,
   so they prove the marker is actually operable, not merely annotated. */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClusterPill, SpotPin } from './SpotMap'

const host = (node: React.ReactNode, onClick: () => void) =>
  render(<div onClick={onClick}>{node}</div>)

describe('map marker keyboard access', () => {
  it('reaches the spot pin by Tab and fires the host handler on Enter and Space', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    host(<SpotPin cat="basketball" name="Kalamaja Court" selected={false} saved={false} dim={false} />, onClick)

    await user.tab()

    expect(screen.getByRole('button', { name: 'Kalamaja Court' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('reaches the cluster pill by Tab and fires the host handler on Enter and Space', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    host(<ClusterPill count={7} dots={['basketball']} active={false} dim={false} />, onClick)

    await user.tab()

    expect(screen.getByRole('button', { name: 'Zoom in to 7 spots' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
