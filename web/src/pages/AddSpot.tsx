import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Legend } from '../features/explore/Legend'
import { LocationPicker } from '../features/add-spot/LocationPicker'
import { Button } from '../shared/ui/Button'
import type { CategoryId } from '../entities/place/categories'
import { TALLINN_CENTER, type LatLng } from '../shared/lib/geo'
import { placesApi } from '../shared/api/placesApi'
import { useSubmissionsStore } from '../shared/store/submissionsStore'
import { useToastStore } from '../shared/store/toastStore'
import { useAuthStore } from '../shared/store/authStore'

/* Add-a-spot — client form → mock createSubmission (PENDING). Photo upload is
   omitted in this build (no object storage yet); submission lands in
   submissionsStore (visible in Account → My submissions) and survives the session. */
type Errors = { name?: string; category?: string; note?: string }

export default function AddSpot() {
  const navigate = useNavigate()
  const addSubmission = useSubmissionsStore((s) => s.add)
  const showToast = useToastStore((s) => s.show)
  const user = useAuthStore((s) => s.user)

  // contributing requires an account — bounce guests to sign-in, return here after
  useEffect(() => {
    if (!user) {
      showToast('Sign in to add a spot')
      navigate('/auth', { replace: true, state: { from: '/add' } })
    }
  }, [user, navigate, showToast])

  const [name, setName] = useState('')
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [coords, setCoords] = useState<LatLng>(TALLINN_CENTER)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = (): Errors => {
    const e: Errors = {}
    if (name.trim().length < 3) e.name = 'Give the spot a name (at least 3 characters).'
    if (!category) e.category = 'Pick a category.'
    if (note.trim().length > 0 && note.trim().length < 10)
      e.note = 'A field note should be a little longer, or leave it empty.'
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0 || !category) return
    setSubmitting(true)
    try {
      const sub = await placesApi.createSubmission({
        name: name.trim(),
        categoryId: category,
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim(),
        photoCount: 0,
      })
      addSubmission(sub)
      showToast('Spot submitted · pending moderation')
      navigate('/explore')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="fg-page">
        <div className="fg-page-in">
          <div className="fg-page-h">
            <div>
              <span className="kicker">Contribute a specimen</span>
              <h1>Add a spot</h1>
              <div className="sub">New spots are reviewed before they go live — submitted as pending.</div>
            </div>
          </div>

          <div className="fg-form">
            <div className="fg-field" data-err={!!errors.name}>
              <label htmlFor="add-name">Name</label>
              <input id="add-name" type="text" value={name} placeholder="e.g. Kalamaja ping-pong tables"
                onChange={(e) => setName(e.target.value)} />
              {errors.name && <div className="err">{errors.name}</div>}
            </div>

            <div className="fg-field" data-err={!!errors.category}>
              <label>Category</label>
              <Legend active={category} onSelect={setCategory} allowAll={false} />
              {errors.category && <div className="err">{errors.category}</div>}
            </div>

            <div className="fg-field">
              <label>Location · drag the map to place the pin</label>
              <LocationPicker value={TALLINN_CENTER} onChange={setCoords} />
              <div className="hint mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div>
            </div>

            <div className="fg-field" data-err={!!errors.note}>
              <label htmlFor="add-note">Field note <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <textarea id="add-note" value={note} placeholder="What makes this spot worth knowing? Access, surface, best time…"
                onChange={(e) => setNote(e.target.value)} />
              {errors.note && <div className="err">{errors.note}</div>}
            </div>

            <div className="fg-form-actions">
              <Button variant="solid" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit spot'}
              </Button>
              <Button onClick={() => navigate('/explore')} disabled={submitting}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
