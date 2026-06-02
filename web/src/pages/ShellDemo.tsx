import { useState } from 'react'
import { AppShell } from '../app/AppShell'
import { Chip } from '../shared/ui/Chip'
import { SpecimenCard } from '../entities/place/SpecimenCard'
import { FG_CATS } from '../entities/place/categories'
import { MOCK_PLACES } from '../entities/place/mockPlaces'

/* Block-2 visual check: shell + atoms + static card grid. */
export default function ShellDemo() {
  const [active, setActive] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<number>>(new Set([3, 10]))

  const toggleCat = (id: string) =>
    setActive((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSave = (id: number) =>
    setSaved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <AppShell route="explore" savedCount={saved.size}>
      <div style={{ padding: '14px 18px 0' }}>
        <div className="fg-keys">
          <Chip label="All" on={active.size === 0} onClick={() => setActive(new Set())} />
          {FG_CATS.map((c) => (
            <Chip key={c.id} cat={c.id} label={c.short} on={active.has(c.id)} onClick={() => toggleCat(c.id)} />
          ))}
        </div>
      </div>
      <div className="fg-demo-grid">
        {MOCK_PLACES.map((p) => (
          <SpecimenCard key={p.id} p={p} saved={saved.has(p.id)} onSave={() => toggleSave(p.id)} />
        ))}
      </div>
    </AppShell>
  )
}
