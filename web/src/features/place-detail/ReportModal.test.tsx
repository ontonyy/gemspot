/* The seam under test is ReportModal.submit(): placesApi.createReport → reports
   store + toast → close. Before plan 022 the try/finally had no catch, so a
   rejected createReport escaped as an unhandled rejection and the modal just sat
   there. These cases pin the failure path: toast shown, modal left open (the
   typed note survives), submit button re-enabled.

   createReport is stubbed with vi.spyOn; toast/report state is read straight off
   the zustand stores. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportModal } from './ReportModal'
import { placesApi } from '../../shared/api/placesApi'
import { useToastStore } from '../../shared/store/toastStore'
import type { PlaceDetailDto, ReportDto } from '../../shared/api/types'

const PLACE = {
  id: 'p-1',
  slug: 'kalamaja-court',
  name: 'Kalamaja Court',
} as PlaceDetailDto

const REPORT: ReportDto = {
  id: 'r-1',
  placeId: 'p-1',
  placeSlug: 'kalamaja-court',
  placeName: 'Kalamaja Court',
  reason: 'closed',
  status: 'OPEN',
  reportedAt: 'just now',
}

const sendButton = () => screen.getByRole('button', { name: 'Send report' })

describe('<ReportModal />', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useToastStore.setState({ message: null })
  })

  it('reports success and closes on a resolved submit', async () => {
    vi.spyOn(placesApi, 'createReport').mockResolvedValue(REPORT)
    const onClose = vi.fn()

    render(<ReportModal place={PLACE} onClose={onClose} />)
    await userEvent.click(sendButton())

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(useToastStore.getState().message).toBe('Thanks — report sent for review')
  })

  it('toasts and stays open when the request rejects', async () => {
    vi.spyOn(placesApi, 'createReport').mockRejectedValue(new Error('boom'))
    const onClose = vi.fn()

    render(<ReportModal place={PLACE} onClose={onClose} />)
    // the click handler must settle on its own — a rejection escaping here would
    // be the unhandled rejection this plan removes
    await userEvent.click(sendButton())

    await waitFor(() =>
      expect(useToastStore.getState().message).toBe("Couldn't send that report — please try again"),
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('re-enables the submit button after a rejected submit', async () => {
    vi.spyOn(placesApi, 'createReport').mockRejectedValue(new Error('boom'))

    render(<ReportModal place={PLACE} onClose={vi.fn()} />)
    await userEvent.click(sendButton())

    await waitFor(() => expect(sendButton()).toBeEnabled())
  })
})
