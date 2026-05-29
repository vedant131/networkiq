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

  // New connections (< 30 days) — warm them up
  connections
    .filter(c => { const d = connAgeDays(c.connected_on); return d !== null && d <= 30 && c.score > 0.5 })
    .slice(0, 2)
    .forEach(c => recs.push({ ...c, _reason: '🆕 New connection — great time to say hello!', _action: 'hello' }))

  // Reconnect: high-score + 2+ years silent
  connections
    .filter(c => { const d = connAgeDays(c.connected_on); return d !== null && d >= 730 && c.score > 0.7 })
    .slice(0, 2)
    .forEach(c => recs.push({ ...c, _reason: '💤 Haven\'t talked in 2+ years — reconnect!', _action: 'networking' }))

  // Recruiters
  connections
    .filter(c => c.category === 'Recruiter/HR' && c.score > 0.5)
    .slice(0, 2)
    .forEach(c => recs.push({ ...c, _reason: '🎯 Recruiter — great for job leads & referrals', _action: 'job' }))

  // Founders with high score
  connections
    .filter(c => c.category === 'Founder/Entrepreneur' && c.score > 0.75)
    .slice(0, 1)
    .forEach(c => recs.push({ ...c, _reason: '🚀 Founder — explore collaboration', _action: 'collaboration' }))

  // Dedup by id, limit to 5
  const seen = new Set()
  return recs.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true }).slice(0, 5)
}

const AVATAR_COLORS = ['#0A66C2','#057642','#915907','#B24020','#520091','#0073B1','#7B5E00']
function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) ?? 65) % AVATAR_COLORS.length] }

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

  // "Find Similar" — filter by same category + seniority
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
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <LandingPage onUpload={handleUpload} onShowUpload={() => setView('upload-form')} />
    </div>
  )

  if (view === 'upload-form') return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src="/logo.svg" alt="NetWorkIQ" style={{ height: 40, marginBottom: 32 }} />
      <div style={{ width: '100%', maxWidth: 540 }}>
        <UploadZone onUpload={handleUpload} dark />
      </div>
    </div>
  )


  if (view === 'processing') return (
    <div style={{ minHeight: '100vh', background: 'var(--li-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LiNav minimal />
      <ProcessingView status={processingMsg} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--li-bg)', display: 'flex', flexDirection: 'column' }}>
      <LiNav total={connections.length} onReset={() => setView('upload')}
        onInsights={() => setShowInsights(v => !v)} showInsights={showInsights} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 80px', width: '100%', flex: 1 }}>

        {/* ── Stat strip ── */}
        {insights && <StatStrip insights={insights} connections={connections} />}

        {/* ── ZIP success banner ── */}
        {fileType === 'zip' && foundFiles && <ZipBanner foundFiles={foundFiles} />}

        {/* ── WhatsApp linked banner ── */}
        {whatsappLinked && <WhatsAppBanner phone={linkedPhone} />}

        {/* ── Smart Recommendations ── */}
        {recommendations.length > 0 && (
          <SmartRecommendations
            recs={recommendations}
            open={showRecs}
            onToggle={() => setShowRecs(v => !v)}
            onContact={setContactTarget}
            onMessage={(c) => { setMessageTarget(c) }}
          />
        )}

        {/* ── Analytics ── */}
        {showInsights && insights && (
          <div style={{ marginBottom: 12 }}>
            <InsightsDashboard insights={insights} />
          </div>
        )}

        {/* ── Search + filters ── */}
        <div className="li-card" style={{ marginBottom: 12 }}>
          <QueryBar onQuery={handleQuery} onReset={resetFilters} label={queryLabel} />
          <FilterPanel connections={connections} onChange={handleFilterChange} />
        </div>

        {/* ── Results ── */}
        <div className="li-card">
          <NetworkTable connections={filtered} onContact={setContactTarget} />
        </div>
      </div>

      {contactTarget && (
        <ContactDrawer
          connection={contactTarget}
          sessionId={sessionId}
          allConnections={connections}
          onClose={() => setContactTarget(null)}
          onMessage={openMessage}
          onFindSimilar={handleFindSimilar}
        />
      )}
      {messageTarget && (
        <MessageModal connection={messageTarget} sessionId={sessionId}
          onClose={() => setMessageTarget(null)} />
      )}
      <ExportButton sessionId={sessionId} />
    </div>
  )
}

/* ── LinkedIn Nav ───────────────────────────────────────────── */
function LiNav({ minimal, total, onReset, onInsights, showInsights }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 90,
      background: 'var(--li-white)', borderBottom: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.svg" alt="NetWorkIQ" height="30" style={{ display:'block' }} />
          {!minimal && total != null && (
            <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginLeft: 4 }}>{total} connections</span>
          )}
        </div>
        {!minimal && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onInsights}>
              {showInsights ? '▲ Hide' : '📊'} Analytics
            </button>
            <button className="btn btn-outline" style={{ padding: '6px 16px', fontSize: 13 }} onClick={onReset}>
              ↩ New Upload
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

/* ── ZIP Banner ─────────────────────────────────────────────── */
function ZipBanner({ foundFiles }) {
  const parts = []
  if (foundFiles.connections) parts.push('📋 Connections')
  if (foundFiles.emails)      parts.push('📧 Emails')
  if (foundFiles.phones)      parts.push('📱 Phones')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '7px 14px', borderRadius: 6, marginBottom: 12,
      background: 'rgba(5,118,66,0.06)', border: '1px solid rgba(5,118,66,0.2)',
      fontSize: 12, color: 'rgba(0,0,0,0.6)',
    }}>
      <span style={{ color: '#057642', fontWeight: 700 }}>✓ LinkedIn ZIP loaded</span>
      <span style={{ color: 'rgba(0,0,0,0.2)' }}>·</span>
      <span>{parts.join(' · ')}</span>
      {foundFiles.emails_enriched && <Pill text="Email enriched" />}
      {foundFiles.phones_enriched && <Pill text="Phone enriched" />}
    </div>
  )
}
function Pill({ text }) {
  return <span style={{ background: 'rgba(5,118,66,0.1)', color: '#057642', borderRadius: 99, padding: '1px 8px', fontWeight: 600, fontSize: 11 }}>{text}</span>
}

/* ── WhatsApp Linked Banner ──────────────────────────────────── */
function WhatsAppBanner({ phone }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px', borderRadius: 8, marginBottom: 12,
      background: 'linear-gradient(135deg, rgba(37,211,102,0.1) 0%, rgba(18,140,126,0.08) 100%)',
      border: '1.5px solid rgba(37,211,102,0.4)',
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>💬</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#128C7E', marginBottom: 4 }}>
          ✅ WhatsApp Bot Connected! — {phone}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', marginBottom: 8 }}>
          Your connections are saved. Text the bot anytime — even after closing this page.
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
        }}>
          {[
            'who works at Google?',
            'find recruiters',
            'show senior engineers',
            'stats',
          ].map(q => (
            <span key={q} style={{
              background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)',
              borderRadius: 20, padding: '3px 10px', fontSize: 12,
              color: '#128C7E', fontStyle: 'italic',
            }}>"{q}"</span>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
          💡 Text the Twilio WhatsApp sandbox number to try it now →
          <strong style={{ marginLeft: 4 }}>+1 415 523 8886</strong>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(0,0,0,0.3)', fontSize: 16, flexShrink: 0,
        padding: 4,
      }}>✕</button>
    </div>
  )
}


/* ── Smart Recommendations ──────────────────────────────────── */
function SmartRecommendations({ recs, open, onToggle, onContact, onMessage }) {
  return (
    <div className="li-card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: open ? '1px solid rgba(0,0,0,0.07)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(0,0,0,0.85)' }}>
            Smart Outreach — {recs.length} people to reach out to
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recs.map((r, i) => (
            <div key={r.id ?? i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
              borderRadius: 6, cursor: 'pointer', transition: 'background 0.1s',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            onClick={() => onContact(r)}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F2EF'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: avatarColor(r.full_name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}>
                {r.full_name?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--li-blue)' }}>{r.full_name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.job_title_clean || r.job_title_raw} · {r.company}
                </div>
              </div>

              {/* Reason */}
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', maxWidth: 200, textAlign: 'right', flexShrink: 0 }}>
                {r._reason}
              </div>

              {/* Message button */}
              <button onClick={e => { e.stopPropagation(); onMessage(r) }}
                style={{
                  border: '1.5px solid var(--li-blue)', background: 'white', color: 'var(--li-blue)',
                  borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                }}>
                Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Stat Strip ─────────────────────────────────────────────── */
function StatStrip({ insights, connections }) {
  // Email coverage
  const withEmail = connections.filter(c => c.email && c.email !== '' && c.email !== 'nan').length
  const emailPct  = connections.length > 0 ? Math.round((withEmail / connections.length) * 100) : 0

  const stats = [
    { label: 'Total Connections',  value: insights.total,                  cls: 'stat-card-blue',  color: 'var(--li-blue)' },
    { label: 'Tech Professionals', value: insights.tech_count,             cls: 'stat-card-teal',  color: 'var(--li-teal)' },
    { label: 'Hiring Potential',   value: insights.hiring_potential_count, cls: 'stat-card-green', color: 'var(--li-green)' },
    { label: 'Emails Available',   value: `${emailPct}%`,                  cls: 'stat-card-gold',  color: 'var(--li-gold)',
      sub: `${withEmail} of ${connections.length}` },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
      {stats.map(s => (
        <div key={s.label} className={`stat-card ${s.cls} anim-in`}>
          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          <div className="stat-label">{s.label}</div>
          {s.sub && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}

/* ── Processing ─────────────────────────────────────────────── */
function ProcessingView({ status }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 380, margin: '60px auto 0' }} className="anim-in">
      <div style={{ width: 64, height: 64, margin: '0 auto 20px', background: 'var(--li-blue)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧠</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'rgba(0,0,0,0.85)' }}>Analysing your network…</h2>
      <p style={{ color: 'rgba(0,0,0,0.5)', fontSize: 14, marginBottom: 24 }}>{status}</p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    </div>
  )
}
