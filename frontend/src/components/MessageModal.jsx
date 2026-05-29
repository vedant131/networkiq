import { useState } from 'react'
import { apiUrl } from '../api'

const PURPOSES = [
  { id: 'networking',     emoji: '🤝', label: 'General Networking' },
  { id: 'job',           emoji: '💼', label: 'Job Opportunity' },
  { id: 'internship',    emoji: '🎓', label: 'Internship Ask' },
  { id: 'collaboration', emoji: '🚀', label: 'Collaboration' },
]

export default function MessageModal({ connection, sessionId, onClose }) {
  const [purpose, setPurpose] = useState('networking')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  const generate = async () => {
    setLoading(true); setMessage('')
    try {
      const res = await fetch(apiUrl('/api/message'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, connection_id: connection.id, purpose }),
      })
      if (!res.ok) throw new Error('API failed')
      const data = await res.json()
      setMessage(data.message)
    } catch { setMessage('Failed to generate. Please try again.') }
    finally { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(message)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>Draft Message</h2>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: 20, padding: '2px 8px' }}>✕</button>
        </div>

        {/* To: field */}
        <div style={{ marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>RECIPIENT</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
          }}>
            <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
              {connection.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{connection.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {connection.job_title_clean} <span style={{ opacity: 0.5 }}>·</span> {connection.company}
              </div>
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>STRATEGY</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PURPOSES.map(p => {
              const active = purpose === p.id
              return (
                <button key={p.id} id={`purpose-${p.id}`} onClick={() => setPurpose(p.id)}
                  style={{
                    padding: '12px', borderRadius: 12,
                    border: `1px solid ${active ? 'rgba(79,163,255,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    background: active ? 'rgba(79,163,255,0.1)' : 'rgba(255,255,255,0.02)',
                    color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
                    textAlign: 'left', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <span style={{ fontSize: 16 }}>{p.emoji}</span> {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <button id="generate-message-btn" className="btn btn-primary liquid-glass w-full"
          onClick={generate} disabled={loading}
          style={{ justifyContent: 'center', marginBottom: 20, padding: '14px', fontSize: 15, borderRadius: 12 }}>
          {loading ? <><span className="spinner" /> Generating Draft…</> : '✨ Generate Message'}
        </button>

        {message && (
          <div className="anim-fade" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="eyebrow">Generated Draft</span>
              <button onClick={copy} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12, borderRadius: 20 }}>
                {copied ? '✓ Copied!' : '📋 Copy Text'}
              </button>
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              style={{
                width: '100%', minHeight: 140, padding: 16, borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)',
                fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                fontFamily: 'inherit', background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(79,163,255,0.4)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.02)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8, textAlign: 'right' }}>
              {message.split(' ').filter(Boolean).length} words · ready to edit
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
