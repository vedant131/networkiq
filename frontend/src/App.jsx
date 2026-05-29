import { useState, useCallback, useMemo } from 'react'
import LandingPage from './components/LandingPage'
import UploadZone from './components/UploadZone'
import NetworkTable from './components/NetworkTable'
import FilterPanel from './components/FilterPanel'
import QueryBar from './components/QueryBar'
import InsightsDashboard from './components/InsightsDashboard'
import MessageModal from './components/MessageModal'
import ContactDrawer from './components/ContactDrawer'
import ExportButton from './components/ExportButton'
import { apiUrl } from './api'
import { searchConnections } from './queryEngine'

/* ── Connection age utility ──────────────────────────────────── */
function connAgeDays(dateStr) {
  if (!dateStr || dateStr === 'nan') return null
  const d = new Date(dateStr)
  return isNaN(d) ? null : Math.floor((Date.now() - d) / 86400000)
}

/* ── Smart Recommendations ───────────────────────────────────── */
function getRecommendations(connections) {
  const recs = []

  connections
    .filter(c => { const d = connAgeDays(c.connected_on); return d !== null && d <= 30 && c.score > 0.5 })
    .slice(0, 2)
    .forEach(c => recs.push({ ...c, _reason: 'New connection — say hello!', _action: 'hello' }))

  connections
    .filter(c => { const d = connAgeDays(c.connected_on); return d !== null && d >= 730 && c.score > 0.7 })
    .slice(0, 2)
    .forEach(c => recs.push({ ...c, _reason: 'Silent for 2+ years — reconnect', _action: 'networking' }))

  connections
    .filter(c => c.category === 'Recruiter/HR' && c.score > 0.5)
    .slice(0, 2)
    .forEach(c => recs.push({ ...c, _reason: 'Recruiter — great for job leads', _action: 'job' }))

  connections
    .filter(c => c.category === 'Founder/Entrepreneur' && c.score > 0.75)
    .slice(0, 1)
    .forEach(c => recs.push({ ...c, _reason: 'Founder — explore collaboration', _action: 'collaboration' }))

  const seen = new Set()
  return recs.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true }).slice(0, 5)
}

export default function App() {
  const [view, setView]               = useState('upload')
  const [sessionId, setSessionId]     = useState(null)
  const [connections, setConnections] = useState([])
  const [filtered, setFiltered]       = useState([])
  const [insights, setInsights]       = useState(null)
  const [queryLabel, setQueryLabel]   = useState('')
  const [showInsights, setShowInsights] = useState(false)
  const [showRecs, setShowRecs]         = useState(true)
  const [contactTarget, setContactTarget] = useState(null)
  const [messageTarget, setMessageTarget] = useState(null)
  const [processingMsg, setProcessingMsg] = useState('')
  const [foundFiles, setFoundFiles]       = useState(null)
  const [fileType, setFileType]           = useState('csv')
  const [activeFilters, setActiveFilters] = useState({})
  const [whatsappLinked, setWhatsappLinked] = useState(false)
  const [linkedPhone, setLinkedPhone]       = useState('')

  const handleUpload = useCallback(async (file, phone = '') => {
    setView('processing'); setProcessingMsg('Reading your connections…')
    const form = new FormData()
    form.append('file', file)
    if (phone) form.append('phone', phone)
    try {
      setProcessingMsg('Classifying with AI…')
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed') }
      const data = await res.json()
      await new Promise(r => setTimeout(r, 200))
      setSessionId(data.session_id); setConnections(data.connections)
      setFiltered(data.connections); setInsights(data.insights)
      setQueryLabel(`All ${data.total} connections`)
      setFoundFiles(data.found_files || null)
      setFileType(data.file_type || 'csv')
      setWhatsappLinked(data.whatsapp_linked || false)
      setLinkedPhone(phone)
      setView('dashboard')
    } catch (e) { alert(`Error: ${e.message}`); setView('upload') }
  }, [])

  const handleQuery = useCallback((query) => {
    if (!connections.length) return
    const { results, label } = searchConnections(connections, query)
    setFiltered(results)
    setQueryLabel(label)
    setActiveFilters({})
  }, [connections])

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters)
    let r = connections
    if (filters.categories?.length)  r = r.filter(c => filters.categories.includes(c.category))
    if (filters.seniorities?.length) r = r.filter(c => filters.seniorities.includes(c.seniority))
    if (filters.domains?.length)     r = r.filter(c => filters.domains.includes(c.domain))
    if (filters.companies?.length)   r = r.filter(c => filters.companies.includes(c.company))
    if (filters.tags?.length)        r = r.filter(c => filters.tags.some(t => c.tags?.includes(t)))
    if (filters.keyword)             r = r.filter(c =>
      `${c.full_name} ${c.job_title_clean} ${c.company}`.toLowerCase().includes(filters.keyword.toLowerCase())
    )
    setFiltered(r); setQueryLabel(`${r.length} of ${connections.length} connections`)
  }, [connections])

  const resetFilters = () => {
    setFiltered(connections); setQueryLabel(`All ${connections.length} connections`)
    setActiveFilters({})
  }

  const handleFindSimilar = useCallback((conn) => {
    const r = connections.filter(c =>
      c.id !== conn.id && c.category === conn.category && c.seniority === conn.seniority
    )
    setFiltered(r)
    setQueryLabel(`${r.length} similar to ${conn.full_name} (${conn.category} · ${conn.seniority})`)
  }, [connections])

  const openMessage = (conn) => { setContactTarget(null); setMessageTarget(conn) }
  const recommendations = useMemo(() => getRecommendations(connections), [connections])

  /* ─────────────── VIEWS ─────────────── */
  if (view === 'upload') return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh' }}>
      <LandingPage onUpload={handleUpload} onShowUpload={() => setView('upload-form')} />
    </div>
  )

  if (view === 'upload-form') return (
    <div className="bg-noise" style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="NetWorkIQ" style={{ height: 44, marginBottom: 40, filter: 'brightness(1.2) drop-shadow(0 0 8px rgba(0,229,255,0.3))' }} />
      <div style={{ width: '100%', maxWidth: 540 }}>
        <UploadZone onUpload={handleUpload} dark />
      </div>
    </div>
  )

  if (view === 'processing') return (
    <div className="bg-noise" style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ProcessingView status={processingMsg} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column' }}>
      <CommandNav total={connections.length} onReset={() => setView('upload')}
        onInsights={() => setShowInsights(v => !v)} showInsights={showInsights} />

      <div style={{ maxWidth: 1200, margin: '32px auto 0', padding: '0 16px 80px', width: '100%', flex: 1 }}>

        {/* ── Overview Panel ── */}
        {insights && <IntelligenceOverview insights={insights} connections={connections} />}

        {/* ── Banners ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {fileType === 'zip' && foundFiles && <ZipBanner foundFiles={foundFiles} />}
          {whatsappLinked && <WhatsAppBanner phone={linkedPhone} />}
        </div>

        {/* ── Smart Recommendations ── */}
        {recommendations.length > 0 && (
          <SmartRecommendations
            recs={recommendations} open={showRecs} onToggle={() => setShowRecs(v => !v)}
            onContact={setContactTarget} onMessage={(c) => { setMessageTarget(c) }}
          />
        )}

        {/* ── Analytics ── */}
        {showInsights && insights && (
          <div style={{ marginBottom: 24 }} className="anim-in">
            <InsightsDashboard insights={insights} />
          </div>
        )}

        {/* ── Search + filters ── */}
        <div className="glass-panel" style={{ marginBottom: 16, padding: '16px' }}>
          <QueryBar onQuery={handleQuery} onReset={resetFilters} label={queryLabel} />
          <FilterPanel connections={connections} onChange={handleFilterChange} />
        </div>

        {/* ── Results List ── */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <NetworkTable connections={filtered} onContact={setContactTarget} />
        </div>
      </div>

      {contactTarget && (
        <ContactDrawer
          connection={contactTarget} sessionId={sessionId} allConnections={connections}
          onClose={() => setContactTarget(null)} onMessage={openMessage} onFindSimilar={handleFindSimilar}
        />
      )}
      {messageTarget && (
        <MessageModal connection={messageTarget} sessionId={sessionId} onClose={() => setMessageTarget(null)} />
      )}
      <ExportButton sessionId={sessionId} />
    </div>
  )
}

/* ── Command Nav (Glassmorphic Top Bar) ───────────────────────── */
function CommandNav({ total, onReset, onInsights, showInsights }) {
  return (
    <header style={{
      position: 'sticky', top: 16, zIndex: 90,
      maxWidth: 1200, margin: '0 auto', width: 'calc(100% - 32px)',
      background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="NetWorkIQ" height="28" style={{ display:'block', filter: 'brightness(1.2)' }} />
          {total != null && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20 }}>
              {total} connections
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onInsights}>
            {showInsights ? 'Close Analytics' : 'Analytics'}
          </button>
          <button className="btn btn-primary liquid-glass" onClick={onReset}>
            New Upload
          </button>
        </div>
      </div>
    </header>
  )
}

/* ── Intelligence Overview (Replaces StatStrip) ───────────────── */
function IntelligenceOverview({ insights, connections }) {
  const withEmail = connections.filter(c => c.email && c.email !== '' && c.email !== 'nan').length
  const emailPct  = connections.length > 0 ? Math.round((withEmail / connections.length) * 100) : 0

  const stats = [
    { label: 'Total Network',  value: insights.total,                  color: '#fff' },
    { label: 'Tech Talent',    value: insights.tech_count,             color: 'var(--accent-blue)' },
    { label: 'High Potential', value: insights.hiring_potential_count, color: 'var(--accent-emerald)' },
    { label: 'Email Coverage', value: `${emailPct}%`,                  color: 'var(--accent-amber)', sub: `${withEmail} contacts` },
  ]
  return (
    <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24, padding: '32px 24px', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)' }}>
      {stats.map(s => (
        <div key={s.label} className="anim-in" style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: '0 20px' }}>
          <div className="font-display" style={{ color: s.color, fontSize: 48, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 8, textShadow: `0 0 20px ${s.color}44` }}>
            {s.value}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {s.label}
          </div>
          {s.sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}

/* ── Banners (Cinematic) ────────────────────────────────────── */
function ZipBanner({ foundFiles }) {
  const parts = []
  if (foundFiles.connections) parts.push('Connections')
  if (foundFiles.emails)      parts.push('Emails')
  if (foundFiles.phones)      parts.push('Phones')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '12px 20px', borderRadius: 12,
      background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)',
      fontSize: 13, color: 'var(--text-muted)',
    }}>
      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>✓ LinkedIn Data Loaded</span>
      <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
      <span>{parts.join(' · ')}</span>
      {foundFiles.emails_enriched && <span className="badge badge-hr">Emails Enriched</span>}
      {foundFiles.phones_enriched && <span className="badge badge-hr">Phones Enriched</span>}
    </div>
  )
}

function WhatsAppBanner({ phone }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '16px 20px', borderRadius: 12,
      background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.2)',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0, textShadow: '0 0 20px rgba(37,211,102,0.5)' }}>💬</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#34d399', marginBottom: 4 }}>
          WhatsApp Bot Connected: <span style={{ color: '#fff' }}>{phone}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Your network is now searchable directly from WhatsApp.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['who works at Google?', 'find recruiters', 'show senior engineers', 'stats'].map(q => (
            <span key={q} style={{
              background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
              borderRadius: 20, padding: '4px 12px', fontSize: 12,
              color: '#34d399', fontStyle: 'italic',
            }}>"{q}"</span>
          ))}
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="btn-ghost" style={{ padding: 4, color: 'var(--text-faint)' }}>✕</button>
    </div>
  )
}

/* ── Smart Recommendations (Cinematic) ──────────────────────── */
function SmartRecommendations({ recs, open, onToggle, onContact, onMessage }) {
  return (
    <div className="glass-panel" style={{ marginBottom: 24, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: open ? 'rgba(255,255,255,0.02)' : 'transparent', border: 'none', cursor: 'pointer',
        borderBottom: open ? '1px solid var(--border-light)' : 'none', transition: 'background 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
            Smart Outreach <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {recs.length} recommended actions</span>
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recs.map((r, i) => (
            <div key={r.id ?? i} className="anim-fade" style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
              borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            }}
            onClick={() => onContact(r)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
            >
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                {r.full_name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{r.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.job_title_clean || r.job_title_raw} · <span style={{ color: 'var(--text-faint)' }}>{r.company}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent-amber)', opacity: 0.8, textAlign: 'right', flexShrink: 0 }}>
                {r._reason}
              </div>
              <button className="btn btn-outline" onClick={e => { e.stopPropagation(); onMessage(r) }} style={{ padding: '6px 14px', fontSize: 12 }}>
                Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Processing (Cinematic) ─────────────────────────────────── */
function ProcessingView({ status }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 400, margin: '0 auto' }} className="anim-in">
      <div className="liquid-glass" style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid rgba(255,255,255,0.1)' }}>🧠</div>
      <h2 className="font-display" style={{ fontSize: 36, marginBottom: 12, color: '#fff', letterSpacing: '-0.02em' }}>Analysing Network</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 }}>{status}</p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    </div>
  )
}
