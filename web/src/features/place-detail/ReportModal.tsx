import { useEffect, useState } from 'react'
import { Icon, Ic } from '../../shared/ui/Icon'
import { Button } from '../../shared/ui/Button'
import { placesApi } from '../../shared/api/placesApi'
import { useReportsStore } from '../../shared/store/reportsStore'
import { useToastStore } from '../../shared/store/toastStore'
import type { PlaceDetailDto } from '../../shared/api/types'
import type { ReportReason } from '../../shared/api/types'

/* Report-a-problem modal. Mirrors the AddSpot submission seam: a client form →
   mock placesApi.createReport (OPEN) → reportsStore (session) → toast. Surfaces
   later in Account → My reports. Scrim + Esc close; centred dialog. */
interface ReportModalProps {
  place: PlaceDetailDto
  onClose: () => void
}

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'closed', label: 'Closed / gone' },
  { id: 'wrong-location', label: 'Wrong location' },
  { id: 'not-free', label: 'No longer free' },
  { id: 'other', label: 'Something else' },
]

export function ReportModal({ place, onClose }: ReportModalProps) {
  const addReport = useReportsStore((s) => s.add)
  const showToast = useToastStore((s) => s.show)
  const [reason, setReason] = useState<ReportReason>('closed')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async () => {
    setSubmitting(true)
    try {
      const report = await placesApi.createReport({
        placeId: place.id,
        placeSlug: place.slug,
        placeName: place.name,
        reason,
        note: note.trim() || undefined,
      })
      addReport(report)
      showToast('Thanks — report sent for review')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fg-modal-scrim" onClick={onClose} />
      <div className="fg-modal" role="dialog" aria-modal="true" aria-label="Report a problem">
        <div className="fg-modal-head">
          <div>
            <span className="kicker">Report a problem</span>
            <h2>{place.name}</h2>
          </div>
          <button className="fg-iconbtn" onClick={onClose} aria-label="Close"><Icon d={Ic.x} size={16} /></button>
        </div>

        <div className="fg-modal-body">
          <div className="fg-radios" role="radiogroup" aria-label="What's wrong?">
            {REASONS.map((r) => (
              <label key={r.id} className="fg-radio" data-on={reason === r.id}>
                <input type="radio" name="report-reason" value={r.id}
                  checked={reason === r.id} onChange={() => setReason(r.id)} />
                <span className="fg-radio-dot" />
                {r.label}
              </label>
            ))}
          </div>

          <div className="fg-field" style={{ marginTop: 16, marginBottom: 0 }}>
            <label htmlFor="report-note">Note <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea id="report-note" value={note} placeholder="Anything that helps us check…"
              onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div className="fg-modal-actions">
          <Button variant="solid" onClick={submit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send report'}
          </Button>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        </div>
      </div>
    </>
  )
}
