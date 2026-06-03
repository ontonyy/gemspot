import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { Legend } from '../features/explore/Legend'
import { LocationPicker } from '../features/add-spot/LocationPicker'
import { Button } from '../shared/ui/Button'
import { Icon, Ic } from '../shared/ui/Icon'
import type { CategoryId } from '../entities/place/categories'
import { TALLINN_CENTER, type LatLng } from '../shared/lib/geo'
import { placesApi } from '../shared/api/placesApi'
import { useSubmissionsStore } from '../shared/store/submissionsStore'
import { useToastStore } from '../shared/store/toastStore'

/* Add-a-spot — client form → mock createSubmission (PENDING). No real upload;
   photos are local previews, only the count is submitted. Submission lands in
   submissionsStore (visible in Account → My submissions) and survives the session. */
type Errors = { name?: string; category?: string; note?: string }

export default function AddSpot() {
  const navigate = useNavigate()
  const addSubmission = useSubmissionsStore((s) => s.add)
  const showToast = useToastStore((s) => s.show)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [coords, setCoords] = useState<LatLng>(TALLINN_CENTER)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
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

  const onPhotos = (files: FileList | null) => {
    if (!files) return
    const urls = Array.from(files).slice(0, 4).map((f) => URL.createObjectURL(f))
    setPhotos((prev) => [...prev, ...urls].slice(0, 4))
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
        photoCount: photos.length,
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
              <Legend active={category} onSelect={setCategory} />
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

            <div className="fg-field">
              <label>Photos <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional · up to 4)</span></label>
              <div className="fg-photos">
                {photos.map((src, i) => <img key={i} className="fg-photo-thumb" src={src} alt="" />)}
                {photos.length < 4 && (
                  <label className="fg-photo-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
                    <Icon d={Ic.plus} size={20} sw={2} />
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
                  </label>
                )}
              </div>
              <div className="hint">Previews only — not uploaded in this build.</div>
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
