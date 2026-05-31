import { useState, useCallback, useMemo } from 'react'
import LandingPage from './components/LandingPage'
import UploadZone from './components/UploadZone'
import NetworkTable from './components/NetworkTable'
import FilterPanel from './components/FilterPanel'
import QueryBar from './components/QueryBar'
import InsightsDashboard from './components/InsightsDashboard'
import MessageModal from './components/MessageModal'
import ContactDrawer from './components/ContactDrawer'
import MatchmakerDrawer from './components/MatchmakerDrawer'
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
  const [showMatchmaker, setShowMatchmaker] = useState(false)
  const [showRecs, setShowRecs]         = useState(true)
  const [contactTarget, setContactTarget] = useState(null)
  const [messageTarget, setMessageTarget] = useState(null)
  const [processingMsg, setProcessingMsg] = useState('')
  const [foundFiles, setFoundFiles]       = useState(null)
  const [fileType, setFileType]           = useState('csv')
  const [activeFilters, setActiveFilters] = useState({})
  const [whatsappLinked, setWhatsappLinked] = useState(false)
  const [linkedPhone, setLinkedPhone]       = useState('')

  const handleUpload = useCallback(async (file, phone = '', pin = '') => {
    setView('processing'); setProcessingMsg('Reading your connections…')
    const form = new FormData()
    form.append('file', file)
    if (phone) form.append('phone', phone)
    if (pin) form.append('pin', pin)
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

  const handleRestore = useCallback(async (phone, pin) => {
    setView('processing'); setProcessingMsg('Unlocking your dashboard…')
    const form = new FormData()
    form.append('phone', phone)
    if (pin) form.append('pin', pin)
    try {
      const res = await fetch(apiUrl('/api/restore'), { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Restore failed') }
      const data = await res.json()
      await new Promise(r => setTimeout(r, 200))
      setSessionId(data.session_id); setConnections(data.connections)
      setFiltered(data.connections); setInsights(data.insights)
      setQueryLabel(`All ${data.total} connections`)
      setFoundFiles(null)
      setFileType('restored')
      setWhatsappLinked(true)
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
        <LandingPage 
          onUpload={handleUpload} 
          onRestore={handleRestore} 
          apiUrl={apiUrl}
          WA_CMD="hello" 
          WA_NUM="+14155238886" 
          WA_LINK="https://wa.me/14155238886?text=hello" 
        />
    </div>
  )

  if (view === 'upload-form') return (
    <div className="bg-noise" style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="NetWorkIQ" style={{ height: 44, marginBottom: 40, filter: 'brightness(1.2) drop-shadow(0 0 8px rgba(0,229,255,0.3))' }} />
      <div style={{ width: '100%', maxWidth: 540 }}>
        <UploadZone onUpload={handleUpload} onRestore={handleRestore} dark />
      </div>
    </div>
  )

  if (view === 'processing') return (
    <div className="bg-noise" style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ProcessingView status={processingMsg} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <video autoPlay loop muted playsInline
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'rgba(0,0,0,0.7)', pointerEvents: 'none' }} />
      
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CommandNav total={connections.length} onReset={() => setView('upload')}
          onInsights={() => setShowInsights(v => !v)} showInsights={showInsights}
          onMatchmaker={() => setShowMatchmaker(true)} />

        <div style={{ maxWidth: 1200, margin: '32px auto 0', padding: '0 16px 80px', width: '100%', flex: 1 }}>

        {/* ── Banners ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {fileType === 'zip' && foundFiles && <ZipBanner foundFiles={foundFiles} />}
          {whatsappLinked && <WhatsAppBanner phone={linkedPhone} />}
        </div>

        {/* ── Analytics ── */}
        {showInsights && insights && (
          <div style={{ marginBottom: 24 }} className="anim-in">
            <InsightsDashboard insights={insights} />
          </div>
        )}

        {/* ── Search + filters ── */}
        <div className="glass-panel" style={{ marginBottom: 16, padding: '16px', position: 'relative', zIndex: 50 }}>
          <QueryBar onQuery={handleQuery} onReset={resetFilters} label={queryLabel} />
          <FilterPanel connections={connections} onChange={handleFilterChange} />
        </div>

        {/* ── Results List ── */}
        <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: 32, position: 'relative', zIndex: 10 }}>
          <NetworkTable connections={filtered} onContact={setContactTarget} />
        </div>

        {/* ── Overview Panel ── */}
        {insights && <IntelligenceOverview insights={insights} connections={connections} />}

        {/* ── Smart Recommendations ── */}
        {/* Removed per user request */}
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
      {showMatchmaker && (
        <MatchmakerDrawer sessionId={sessionId} onClose={() => setShowMatchmaker(false)} onMessage={openMessage} />
      )}
      <ExportButton sessionId={sessionId} />
      </div>
    </div>
  )
}

/* ── Command Nav (Glassmorphic Top Bar) ───────────────────────── */
function CommandNav({ total, onReset, onInsights, showInsights, onMatchmaker }) {
  return (
    <header style={{
      position: 'sticky', top: 16, zIndex: 90,
      maxWidth: 1200, margin: '0 auto', width: 'calc(100% - 32px)',
      background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderRadius: '99px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="NetWorkIQ" height="26" style={{ display:'block', opacity: 0.9 }} />
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          {total != null && (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '0.02em' }}>
              {total} connections
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onInsights} style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 16px', borderRadius: 99,
            transition: 'color 0.2s', fontFamily: 'inherit'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >
            {showInsights ? 'Close Analytics' : 'View Analytics'}
          </button>
          
          <button onClick={onMatchmaker} style={{
            background: 'transparent', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--accent-emerald)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 16px', borderRadius: 99,
            transition: 'all 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)' }}
          >
            ✨ Match Me
          </button>

          <button onClick={onReset} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            padding: '8px 20px', borderRadius: 99, transition: 'all 0.2s', fontFamily: 'inherit'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.02)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
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
    <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
      {/* Stats Panel */}
      <div className="glass-panel" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '32px 24px', background: 'rgba(255,255,255,0.03)' }}>
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

      {/* Persistent Bot QR Card */}
      <div className="glass-panel" style={{ width: 280, padding: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.03)' }}>
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://wa.me/14155238886?text=join%20sometime-certainly')}&margin=0&bgcolor=ffffff&color=000000`} 
          alt="WhatsApp QR" 
          style={{ width: 80, height: 80, borderRadius: 8, background: '#fff', padding: 4 }} 
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>WhatsApp Bot</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Scan to query your network from WhatsApp.</div>
        </div>
      </div>
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
function SmartRecommendations({ recs, onContact, onMessage }) {
  return (
    <div className="glass-panel" style={{ marginBottom: 24, overflow: 'hidden' }}>
      <div style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
            Smart Outreach <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {recs.length} recommended actions</span>
          </span>
        </div>
      </div>

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
