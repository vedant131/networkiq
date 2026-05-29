import React, { useState } from 'react'

const CATEGORY_EMOJI = {
  'Software Engineer':    '💻',
  'Data Scientist':       '📊',
  'Recruiter/HR':         '🤝',
  'Founder/Entrepreneur': '🚀',
  'Student':              '🎓',
  'Marketing/Sales':      '📣',
  'Other':                '👤',
}
const BADGE_CLASS = {
  'Software Engineer':    'badge-swe',
  'Data Scientist':       'badge-ds',
  'Recruiter/HR':         'badge-hr',
  'Founder/Entrepreneur': 'badge-founder',
  'Student':              'badge-student',
  'Marketing/Sales':      'badge-marketing',
  'Other':                'badge-other',
}
const TAG_CLASS = {
  'Hiring Potential':      'tag-hiring',
  'Tech':                  'tag-tech',
  'Business':              'tag-business',
  'High Value Connection': 'tag-hv',
  'Startup':               'tag-startup',
  'Academia':              'tag-academia',
}
const SENIORITY_DOT = {
  'Intern':    'seniority-dot-intern',
  'Junior':    'seniority-dot-junior',
  'Mid-level': 'seniority-dot-mid',
  'Senior':    'seniority-dot-senior',
  'Lead':      'seniority-dot-lead',
  'Executive': 'seniority-dot-exec',
}

function parseConnectionAge(dateStr) {
  if (!dateStr || dateStr === 'nan' || dateStr === '') return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const days = Math.floor((Date.now() - d) / 86400000)
  return { days, date: d }
}

function formatAge(days) {
  if (days < 1)   return 'Today'
  if (days < 7)   return `${days}d ago`
  if (days < 30)  return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  const yrs = Math.floor(days / 365)
  return `${yrs} yr${yrs > 1 ? 's' : ''} ago`
}

function FreshnessBadge({ connected_on }) {
  const age = parseConnectionAge(connected_on)
  if (!age) return null
  if (age.days <= 90) return (
    <span style={{
      background: 'rgba(52,211,153,0.1)', color: 'var(--accent-emerald)',
      border: '1px solid rgba(52,211,153,0.2)',
      borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 7px',
    }}>NEW</span>
  )
  if (age.days >= 730) return (
    <span style={{
      background: 'rgba(251,191,36,0.1)', color: 'var(--accent-amber)',
      border: '1px solid rgba(251,191,36,0.2)',
      borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 7px',
    }}>COLD</span>
  )
  return null
}

function CopyBtn({ value, label }) {
  const [copied, setCopied] = useState(false)
  if (!value || value === 'nan' || value === '') return null
  const copy = (e) => {
    e.preventDefault(); e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button onClick={copy} title={`Copy ${label}`} style={{
      border: '1px solid',
      background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
      borderColor: copied ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
      color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
      borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
      padding: '4px 10px', transition: 'all 0.15s',
    }}>
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  )
}

function ScoreBar({ score }) {
  const pct   = Math.round((score ?? 0) * 100)
  const color = score > 0.7 ? 'var(--accent-emerald)' : score > 0.4 ? 'var(--accent-amber)' : 'var(--text-faint)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width 0.8s ease', boxShadow: `0 0 10px ${color}` }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 18, minWidth: 28, textAlign: 'right',
        color: color,
      }}>{pct}</span>
    </div>
  )
}

function Field({ icon, label, children, action }) {
  return (
    <div className="contact-field">
      <div className="contact-field-icon">{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="contact-field-label">{label}</div>
          {action}
        </div>
        <div className="contact-field-value">{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

export default function ContactDrawer({
  connection: c, sessionId, onClose, onMessage, onFindSimilar, allConnections = [],
}) {
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichedEmail, setEnrichedEmail] = useState(null)
  const [enrichError, setEnrichError] = useState(null)
  
  if (!c) return null

  const hasRealUrl = c.linkedin_url && c.linkedin_url !== '' && c.linkedin_url !== 'nan'
  const profileUrl = hasRealUrl
    ? c.linkedin_url
    : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.full_name)}`
  const googleUrl  = `https://www.google.com/search?q=${encodeURIComponent(`${c.full_name} ${c.company} LinkedIn`)}`

  const connEmail = enrichedEmail || ((c.email && c.email !== '' && c.email !== 'nan') ? c.email : null)
  
  const handleEnrich = async () => {
    setIsEnriching(true); setEnrichError(null)
    try {
      const { apiUrl } = await import('../api.js')
      const res = await fetch(apiUrl(`/api/enrich/${sessionId}/${c.id}`), { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Email not found') }
      const data = await res.json()
      setEnrichedEmail(data.email)
      c.email = data.email 
    } catch (e) {
      setEnrichError(e.message)
    } finally {
      setIsEnriching(false)
    }
  }

  const age = parseConnectionAge(c.connected_on)
  const score = c.score ?? 0

  const sameCompany = allConnections.filter(
    x => x.id !== c.id && x.company && x.company === c.company
  )

  const profileSummary = [
    c.full_name,
    `${c.job_title_clean || c.job_title_raw} at ${c.company}`,
    connEmail ? `Email: ${connEmail}` : '',
    hasRealUrl ? c.linkedin_url : '',
  ].filter(Boolean).join('\n')

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" id="contact-drawer">

        <div className="drawer-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span className="eyebrow">Dossier</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <CopyBtn value={profileSummary} label="Profile" />
              <button onClick={onClose} className="btn-ghost" style={{ fontSize: 20, padding: '2px 8px' }}>✕</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div className="avatar" style={{
              width: 72, height: 72, fontSize: 28, boxShadow: '0 0 20px rgba(255,255,255,0.1)',
            }}>
              {c.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '0.02em' }}>
                {c.full_name}
              </h2>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
                {c.job_title_clean || c.job_title_raw}
                {c.company && <> · <strong style={{ color: 'var(--text-main)' }}>{c.company}</strong></>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge ${BADGE_CLASS[c.category] || 'badge-other'}`} style={{ fontSize: 10 }}>
                  {CATEGORY_EMOJI[c.category]} {c.category}
                </span>
                <FreshnessBadge connected_on={c.connected_on} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <a href={profileUrl} target="_blank" rel="noreferrer" id="view-linkedin-btn" className="btn btn-outline"
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
              <LinkedInIcon /> LinkedIn
            </a>
            <button id="drawer-message-btn" className="btn btn-primary liquid-glass" onClick={() => onMessage(c)}
              style={{ flex: 1, justifyContent: 'center' }}>
              ✉️ Message
            </button>
            <a href={googleUrl} target="_blank" rel="noreferrer" className="btn btn-outline"
              style={{ padding: '10px', textDecoration: 'none' }}>🔍</a>
            {onFindSimilar && (
              <button title="Find similar people" onClick={() => { onClose(); onFindSimilar(c) }} className="btn btn-outline"
                style={{ padding: '10px' }}>👥</button>
            )}
          </div>
        </div>

        <Section title="Contact Info">
          <Field icon="🔗" label="LinkedIn Profile" action={hasRealUrl ? <CopyBtn value={c.linkedin_url} label="URL" /> : null}>
            <a href={profileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
              {hasRealUrl ? 'Open Profile ↗' : 'Search on LinkedIn ↗'}
            </a>
            {hasRealUrl && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, wordBreak: 'break-all' }}>
                {c.linkedin_url.replace('https://', '')}
              </div>
            )}
          </Field>

          <Field icon="📧" label="Email Address" action={connEmail ? <CopyBtn value={connEmail} label="Email" /> : null}>
            {connEmail ? (
              <a href={`mailto:${connEmail}`} style={{ color: 'var(--accent-emerald)', fontWeight: 600, textDecoration: 'none' }}>{connEmail}</a>
            ) : (
              <div>
                {isEnriching ? (
                  <div style={{ fontSize: 12, color: 'var(--accent-blue)' }}><span className="spinner" style={{width:10,height:10,display:'inline-block',marginRight:6}}/>Searching databases...</div>
                ) : (
                  <>
                    <button onClick={handleEnrich} disabled={!c.company || c.company === 'nan'} className="btn btn-outline" style={{
                      padding: '4px 12px', fontSize: 12, borderRadius: 20, color: 'var(--accent-blue)', borderColor: 'rgba(79,163,255,0.3)',
                    }}>✨ Deep Search Email</button>
                    {(!c.company || c.company === 'nan') && <div style={{fontSize: 11, color: 'var(--text-faint)', marginTop: 6}}>Company required for deep search.</div>}
                    {enrichError && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>{enrichError}</div>}
                  </>
                )}
              </div>
            )}
          </Field>

          <Field icon="📅" label="Connected On">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-main)' }}>{c.connected_on || '—'}</span>
              {age && (
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '2px 8px',
                }}>{formatAge(age.days)}</span>
              )}
            </div>
          </Field>
        </Section>

        <Section title="Current Affiliation">
          <Field icon="💼" label="Role">
            <div>{c.job_title_clean || c.job_title_raw || '—'}</div>
          </Field>
          <Field icon="🏢" label="Organization">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{c.company || '—'}</span>
              {sameCompany.length > 0 && (
                <span style={{
                  fontSize: 10, background: 'rgba(79,163,255,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(79,163,255,0.2)',
                  borderRadius: 99, padding: '2px 8px', fontWeight: 600, cursor: 'default', textTransform: 'uppercase', letterSpacing: '0.05em'
                }} title={sameCompany.slice(0,5).map(x=>x.full_name).join(', ')}>
                  +{sameCompany.length} in network
                </span>
              )}
            </div>
          </Field>
        </Section>

        <Section title="Intelligence Profile">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row label="Sector">
              <span className={`badge ${BADGE_CLASS[c.category] || 'badge-other'}`}>
                {CATEGORY_EMOJI[c.category]} {c.category}
              </span>
            </Row>
            <Row label="Level">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`seniority-dot ${SENIORITY_DOT[c.seniority] || 'seniority-dot-mid'}`} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{c.seniority || 'Unknown'}</span>
              </div>
            </Row>
            <Row label="Domain">
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{c.domain || 'General'}</span>
            </Row>
            <div>
              <Row label="Network Value Score" />
              <div style={{ marginTop: 8 }}><ScoreBar score={score} /></div>
            </div>
            {(c.tags?.length > 0) && (
              <div style={{ marginTop: 8 }}>
                <div className="contact-field-label">Attributes</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {c.tags.map(t => (
                    <span key={t} className={`tag ${TAG_CLASS[t] || 'tag-tech'}`}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section title="Recommended Strategy">
          <OutreachReason connection={c} />
        </Section>

      </aside>
    </>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </div>
  )
}

function OutreachReason({ connection: c }) {
  const age = parseConnectionAge(c.connected_on)
  const reasons = []

  if (c.category === 'Recruiter/HR') reasons.push({ icon: '🎯', text: 'Recruiter — ask about active mandates' })
  if (c.category === 'Founder/Entrepreneur') reasons.push({ icon: '🚀', text: 'Founder — potential collaboration' })
  if (c.tags?.includes('Hiring Potential')) reasons.push({ icon: '💼', text: 'Likely hiring — ask about open roles' })
  if (c.tags?.includes('High Value Connection')) reasons.push({ icon: '⭐', text: 'High-value connection — prioritize' })
  if (age && age.days <= 30) reasons.push({ icon: '🆕', text: 'Recent connection — establish rapport' })
  if (age && age.days >= 730) reasons.push({ icon: '💤', text: 'Dormant connection — time to reconnect' })
  if (c.score > 0.8) reasons.push({ icon: '🔥', text: 'Top-tier rank — high priority' })

  if (reasons.length === 0) {
    reasons.push({ icon: '🤝', text: 'Maintain relationship — check in' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reasons.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 16, flexShrink: 0, opacity: 0.8 }}>{r.icon}</span>
          <span style={{ lineHeight: 1.5 }}>{r.text}</span>
        </div>
      ))}
    </div>
  )
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}
