import { useState, useMemo, useRef, useCallback } from 'react'

/* ── Seniority display order (not alphabetical) ─────────────── */
const SENIORITY_ORDER = ['Intern','Junior','Mid-level','Senior','Lead','Executive']

/* ── Company search dropdown — handles 500+ companies ───────── */
function CompanyDropdown({ companies, selected, onToggle, onClear }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef()
  const active = selected.length > 0

  const visible = useMemo(() => {
    const s = search.toLowerCase()
    return companies.filter(([name]) => name.toLowerCase().includes(s)).slice(0, 80)
  }, [companies, search])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 8, left: r.left })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button ref={btnRef} className={`filter-chip ${active ? 'active' : ''}`} onClick={handleOpen}>
        Company
        {active && (
          <span style={{ background: 'var(--accent-emerald)', color: '#000', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
            {selected.length}
          </span>
        )}
        <span style={{ fontSize: 10, opacity: 0.55, marginLeft: 2 }}>▼</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => { setOpen(false); setSearch('') }} />
          <div className="anim-in" style={{
            position: 'fixed', top: dropPos.top, left: dropPos.left,
            zIndex: 1000, background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)',
            borderRadius: 12, border: '1px solid var(--border-light)',
            width: 280, boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', maxHeight: 380,
          }}>
            {/* Search box */}
            <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search companies…"
                style={{
                  width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.02)',
                  fontFamily: 'inherit', color: 'var(--text-main)', transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.02)' }}
              />
            </div>

            {/* Company list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 8px' }}>
              {visible.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-faint)' }}>No companies match</div>
              )}
              {visible.map(([name, count]) => (
                <label key={name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <input type="checkbox" checked={selected.includes(name)} onChange={() => onToggle(name)}
                    style={{ accentColor: 'var(--accent-emerald)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: selected.includes(name) ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: selected.includes(name) ? 600 : 400,
                  }}>{name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{count}</span>
                </label>
              ))}
            </div>

            {selected.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 12px' }}>
                <button onClick={() => { onClear(); setOpen(false); setSearch('') }}
                  style={{ fontSize: 13, color: 'var(--accent-emerald)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Clear ({selected.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* ── Generic multi-select dropdown ──────────────────────────── */
function MultiDropdown({ label, options, selected, onToggle, onClear, showCounts = false }) {
  const [open, setOpen]       = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef()
  const active = selected.length > 0

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 8, left: r.left })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button ref={btnRef} className={`filter-chip ${active ? 'active' : ''}`} onClick={handleOpen}>
        {label}
        {active && (
          <span style={{ background: 'var(--accent-emerald)', color: '#000', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
            {selected.length}
          </span>
        )}
        <span style={{ fontSize: 10, opacity: 0.55, marginLeft: 2 }}>▼</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
          <div className="anim-in" style={{
            position: 'fixed', top: dropPos.top, left: dropPos.left,
            zIndex: 1000, background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)',
            borderRadius: 12, border: '1px solid var(--border-light)',
            minWidth: 240, maxHeight: 340, overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
            padding: '8px',
          }}>
            {options.map(opt => {
              const name    = Array.isArray(opt) ? opt[0] : opt
              const count   = Array.isArray(opt) ? opt[1] : null
              const checked = selected.includes(name)
              return (
                <label key={name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <input type="checkbox" checked={checked} onChange={() => onToggle(name)}
                    style={{ accentColor: 'var(--accent-emerald)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: checked ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: checked ? 600 : 400,
                  }}>{name}</span>
                  {count != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{count}</span>
                  )}
                </label>
              )
            })}
            {selected.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 12px 2px', marginTop: 8 }}>
                <button onClick={() => { onClear(); setOpen(false) }}
                  style={{ fontSize: 13, color: 'var(--accent-emerald)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Clear ({selected.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* ── Main FilterPanel ────────────────────────────────────────── */
export default function FilterPanel({ connections, onChange }) {
  const [filters, setFilters] = useState({
    categories: [], seniorities: [], domains: [], companies: [], tags: [], keyword: '',
  })

  /* ── Derive all options from real data ── */

  // Categories with counts, sorted by count desc
  const categories = useMemo(() => {
    const counts = {}
    connections.forEach(c => { if (c.category) counts[c.category] = (counts[c.category] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [connections])

  // Seniorities in logical order, only those present in data
  const seniorities = useMemo(() => {
    const counts = {}
    connections.forEach(c => { if (c.seniority) counts[c.seniority] = (counts[c.seniority] || 0) + 1 })
    const ordered = SENIORITY_ORDER.filter(s => counts[s]).map(s => [s, counts[s]])
    Object.entries(counts).forEach(([s, n]) => { if (!SENIORITY_ORDER.includes(s)) ordered.push([s, n]) })
    return ordered
  }, [connections])

  // Companies sorted by count desc
  const companies = useMemo(() => {
    const counts = {}
    connections.forEach(c => { if (c.company) counts[c.company] = (counts[c.company] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [connections])

  // Domains sorted by count
  const domains = useMemo(() => {
    const counts = {}
    connections.forEach(c => { if (c.domain) counts[c.domain] = (counts[c.domain] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [connections])

  // Tags from actual data
  const tags = useMemo(() => {
    const counts = {}
    connections.forEach(c => (c.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [connections])

  const update = useCallback((patch) => {
    const next = { ...filters, ...patch }
    setFilters(next); onChange(next)
  }, [filters, onChange])

  const toggleArr = (field, value) => {
    const arr = filters[field]
    update({ [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] })
  }

  const activeCount = filters.categories.length + filters.seniorities.length +
    filters.domains.length + filters.companies.length + filters.tags.length +
    (filters.keyword ? 1 : 0)

  const clearAll = () => {
    const r = { categories: [], seniorities: [], domains: [], companies: [], tags: [], keyword: '' }
    setFilters(r); onChange(r)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>

      {/* Keyword */}
      <input
        style={{
          width: 160, fontSize: 13, padding: '7px 12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, transition: 'all 0.2s', outline: 'none',
          fontFamily: 'inherit', color: 'var(--text-main)',
        }}
        placeholder="Name, title…"
        value={filters.keyword}
        onChange={e => update({ keyword: e.target.value })}
        onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)' }}
        onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
      />

      <MultiDropdown label="Category"  options={categories}  selected={filters.categories}
        onToggle={v => toggleArr('categories', v)} onClear={() => update({ categories: [] })} />

      <MultiDropdown label="Seniority" options={seniorities} selected={filters.seniorities}
        onToggle={v => toggleArr('seniorities', v)} onClear={() => update({ seniorities: [] })} />

      <CompanyDropdown companies={companies} selected={filters.companies}
        onToggle={v => toggleArr('companies', v)} onClear={() => update({ companies: [] })} />

      <MultiDropdown label="Domain"    options={domains}     selected={filters.domains}
        onToggle={v => toggleArr('domains', v)} onClear={() => update({ domains: [] })} />

      <MultiDropdown label="Tags"      options={tags}        selected={filters.tags}
        onToggle={v => toggleArr('tags', v)} onClear={() => update({ tags: [] })} />

      {activeCount > 0 && (
        <button onClick={clearAll} className="btn-ghost"
          style={{
            fontSize: 12, padding: '6px 12px', borderRadius: 20,
            color: 'var(--text-muted)', fontFamily: 'inherit', fontWeight: 600,
          }}>
          ✕ Clear all ({activeCount})
        </button>
      )}
    </div>
  )
}
