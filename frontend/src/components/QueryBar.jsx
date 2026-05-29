import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Find recruiters in my network',
  'Show senior software engineers',
  'Who can help me get an internship?',
  'Data scientists at top companies',
  'Find founders and CEOs',
]

export default function QueryBar({ onQuery, onReset, label }) {
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const inputRef = useRef()
  const wrapRef  = useRef()

  useEffect(() => {
    const down = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() } }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const click = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const submit = (q = query) => {
    const t = q.trim(); if (!t) { onReset(); setQuery(''); return }
    setOpen(false)
    onQuery(t)
  }

  return (
    <div style={{
      paddingBottom: 16, borderBottom: '1px solid var(--border-light)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>

      {/* Command Palette style search bar */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: open ? 'rgba(255,255,255,0.05)' : 'var(--bg-panel)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.2)' : 'var(--border-light)'}`,
          borderRadius: 12, transition: 'all 0.2s',
          boxShadow: open ? '0 0 15px rgba(255,255,255,0.05)' : 'none',
        }}>
          <span style={{ padding: '0 12px 0 16px', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🔍'}
          </span>
          <input
            id="ai-query-input"
            ref={inputRef}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: 'var(--text-main)', fontSize: 14, padding: '12px 0',
              fontFamily: 'inherit', letterSpacing: '0.01em',
            }}
            placeholder='Search network — "Find recruiters at Google"'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
            onFocus={() => setOpen(true)}
          />
          {query ? (
            <button onClick={() => { setQuery(''); onReset() }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 16px', color: 'var(--text-muted)', fontSize: 16 }}>
              ✕
            </button>
          ) : (
            <div style={{ padding: '0 16px', color: 'var(--text-faint)', fontSize: 12, fontFamily: 'monospace' }}>⌘K</div>
          )}
        </div>

        {/* Dark theme suggestions dropdown */}
        {open && !query && (
          <div className="anim-in" style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100,
            background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-light)', borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
            overflow: 'hidden', padding: 8,
          }}>
            <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Suggested searches
            </div>
            {SUGGESTIONS.map(s => (
              <div key={s} onMouseDown={() => { setQuery(s); submit(s) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', cursor: 'pointer',
                  transition: 'all 0.15s', fontSize: 13,
                  color: 'var(--text-main)', borderRadius: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-main)' }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>✨</span>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <button id="query-submit-btn" className="btn btn-primary liquid-glass"
        onClick={() => submit()} disabled={loading}
        style={{ padding: '12px 24px', flexShrink: 0, fontSize: 14, borderRadius: 12 }}>
        Search
      </button>

      {label && (
        <span style={{ fontSize: 12, color: 'var(--accent-emerald)', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500, background: 'rgba(52,211,153,0.1)', padding: '4px 10px', borderRadius: 20 }}>
          {label}
        </span>
      )}
    </div>
  )
}
