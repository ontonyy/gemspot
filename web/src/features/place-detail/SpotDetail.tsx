import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { catColor, CategoryGlyph } from '../../entities/place/categories'
import { Photo } from '../../entities/place/Photo'
import { ReportModal } from './ReportModal'
import { Icon, Ic } from '../../shared/ui/Icon'
import { usePlace } from '../../shared/api/queries'
import { haversineKm, roundKm } from '../../shared/lib/geo'
import { useGeoStore } from '../../shared/store/geoStore'
import { useSavedStore } from '../../shared/store/savedStore'
import { useToastStore } from '../../shared/store/toastStore'
import { useAuthStore } from '../../shared/store/authStore'
import { track } from '../../shared/api/track'

/* Spot detail panel. Slides over the rail on desktop, full-screen on mobile.
   Driven by slug → usePlace. fg-app.jsx Detail + fg.css .fg-detail spec.
   Adds an Apple/Google Directions deep-link menu (fg shipped a single button). */
interface SpotDetailProps {
  slug: string
  mobile?: boolean
  onClose: () => void
}

export function SpotDetail({ slug, mobile, onClose }: SpotDetailProps) {
  const { data: p, isLoading } = usePlace(slug)
  const origin = useGeoStore((s) => s.origin)
  const isSaved = useSavedStore((s) => s.ids.includes(p?.id ?? ''))
  const toggleSave = useSavedStore((s) => s.toggle)
  const showToast = useToastStore((s) => s.show)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  // save + report require an account; guests are bounced to sign-in, returned here
  const requireAuth = (msg: string): boolean => {
    if (user) return true
    showToast(msg)
    navigate('/auth', { state: { from: `/spot/${slug}` } })
    return false
  }

  const [shot, setShot] = useState(0)
  const [dirOpen, setDirOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const mobileStyle: CSSProperties = mobile
    ? { position: 'absolute', width: '100%', borderRight: 'none', boxShadow: 'none', zIndex: 45 }
    : {}

  if (isLoading || !p) {
    return (
      <aside className="fg-detail" style={mobileStyle}>
        <DetailSkeleton onClose={onClose} />
      </aside>
    )
  }

  const cat = p.category.id
  const km = roundKm(haversineKm(origin, { lat: p.lat, lng: p.lng }))
  const photos = p.photos.filter((ph) => ph.url)
  const hasPhotos = photos.length > 0
  const onSave = () => {
    if (!requireAuth('Sign in to save spots')) return
    const nowSaved = toggleSave(p.id)
    if (nowSaved) track('save', undefined, p.id)
    showToast(nowSaved ? 'Saved to your collection' : 'Removed from collection')
  }

  const onShare = async () => {
    track('share', undefined, p.id)
    const url = `${window.location.origin}${import.meta.env.BASE_URL}#/spot/${p.slug}`
    const shareData = { title: p.name, text: `${p.name} · GemSpot Tallinn`, url }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // user cancelled or share failed → fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch {
      showToast('Could not copy link')
    }
  }

  return (
    <aside className="fg-detail" style={{ '--cc': catColor(cat), ...mobileStyle } as CSSProperties}>
      <div className="fg-detail-hero">
        <Photo cat={cat} glyph={!hasPhotos} large url={hasPhotos ? photos[shot]?.url : undefined}
          label={hasPhotos ? undefined : p.category.label} />
        <div className="fg-detail-top">
          <button className="fg-iconbtn" onClick={onClose} aria-label="Back"><Icon d={Ic.back} size={18} /></button>
          <button className="fg-iconbtn" onClick={onShare} aria-label="Share"><Icon d={Ic.share} size={17} /></button>
        </div>
        <span className="fg-detail-cattag"><CategoryGlyph cat={cat} size={13} />{p.category.label}</span>
        {hasPhotos && photos.length > 1 && (
          <div className="fg-detail-dots">
            {photos.map((_, i) => (
              <i key={i} data-on={i === shot} onClick={() => setShot(i)} />
            ))}
          </div>
        )}
      </div>

      <div className="fg-detail-body">
        <div className="fg-detail-no">Specimen №{p.id} · Tallinn</div>
        <h1>{p.name}</h1>
        <div className="fg-detail-loc">
          <Icon d={Ic.pin} size={13} />{p.neighborhood}<span className="dot" />{km.toFixed(1)}km away
          <span className="dot" /><span style={{ color: 'var(--ink-3)' }}>{p.savesCount} saves</span>
        </div>

        <div className="fg-byline">
          spotted by <b>@{p.contributor.name}</b>
          {p.verifiedAt && (
            <span className="fg-verified">
              <span className="tick"><Icon d={Ic.check} size={8} sw={3.5} /></span>verified {formatDistanceToNow(new Date(p.verifiedAt), { addSuffix: true })}
            </span>
          )}
        </div>

        <p className="fg-note">{p.note}</p>

        <div className="fg-notes-h">Field notes</div>
        <div className="fg-facts">
          <div className="fg-fact"><span className="k">Access</span><span className="v">{p.fieldNotes.access}</span></div>
          <div className="fg-fact"><span className="k">Lit</span><span className="v">{p.fieldNotes.lit}</span></div>
          <div className="fg-fact"><span className="k">Best</span><span className="v">{p.fieldNotes.best}</span></div>
        </div>

        {hasPhotos && (
          <>
            <div className="fg-notes-h">Sightings</div>
            <div className="fg-strip">
              {photos.map((ph, i) => <Photo key={i} cat={cat} url={ph.url} />)}
            </div>
          </>
        )}

        <button className="fg-report-link" onClick={() => navigate(`/explore?focus=${p.slug}`)}>
          <Icon d={Ic.pin} size={13} />Open in full map →
        </button>

        <button className="fg-report-link" onClick={() => requireAuth('Sign in to report a problem') && setReportOpen(true)}>
          <Icon d={Ic.flag} size={13} />Report a problem · outdated
        </button>
      </div>

      {reportOpen && <ReportModal place={p} onClose={() => setReportOpen(false)} />}

      <div className="fg-detail-bar">
        <button className="fg-btn fg-savebar" data-saved={isSaved} onClick={onSave}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.6L6 21z" />
          </svg>{isSaved ? 'Collected' : 'Save'}
        </button>

        <div className="fg-dir">
          {dirOpen && (
            <>
              <div className="fg-dir-scrim" onClick={() => setDirOpen(false)} />
              <div className="fg-dir-menu" role="menu">
                <a className="fg-dir-item" href={p.appleMapsUrl} target="_blank" rel="noreferrer" onClick={() => { track('directions', { provider: 'apple' }, p.id); setDirOpen(false) }}>
                  <Icon d={Ic.arrow} size={15} sw={2} />Apple Maps
                </a>
                <a className="fg-dir-item" href={p.googleMapsUrl} target="_blank" rel="noreferrer" onClick={() => { track('directions', { provider: 'google' }, p.id); setDirOpen(false) }}>
                  <Icon d={Ic.arrow} size={15} sw={2} />Google Maps
                </a>
              </div>
            </>
          )}
          <button className="fg-btn fg-btn-solid fg-btn-block" aria-haspopup="menu" aria-expanded={dirOpen}
            onClick={() => setDirOpen((v) => !v)}>
            <Icon d={Ic.arrow} size={17} sw={2} />Directions
          </button>
        </div>
      </div>
    </aside>
  )
}

/* Loading skeleton — mirrors the panel's hero + body rhythm. */
function DetailSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fg-detail-hero fg-detail-hero-skel">
        <div className="fg-detail-top">
          <button className="fg-iconbtn" onClick={onClose} aria-label="Back"><Icon d={Ic.back} size={18} /></button>
        </div>
      </div>
      <div className="fg-detail-body">
        <span className="fg-skel" style={{ width: 120, height: 11, marginTop: 4 }} />
        <span className="fg-skel" style={{ width: '70%', height: 24, marginTop: 12 }} />
        <span className="fg-skel" style={{ width: '55%', height: 12, marginTop: 12 }} />
        <span className="fg-skel" style={{ width: '100%', height: 44, marginTop: 18 }} />
        <span className="fg-skel" style={{ width: '100%', height: 60, marginTop: 16 }} />
        <span className="fg-skel" style={{ width: '100%', height: 64, marginTop: 22 }} />
      </div>
    </>
  )
}
