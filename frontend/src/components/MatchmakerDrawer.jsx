import React, { useState } from 'react'
import { apiUrl } from '../api'

function Section({ title, children }) {
  return (
    <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

export default function MatchmakerDrawer({ sessionId, onClose, onMessage }) {
  const [profileText, setProfileText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleMatch = async () => {
    const text = profileText.trim()
    if (!text) return
    
    // UI/UX validation: prevent single-word or extremely short inputs
    const wordCount = text.split(/\s+/).length
    if (wordCount < 4) {
      setError('Please provide a bit more detail about your background or goals (at least a few words) so we can find relevant matches.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(apiUrl('/api/match_profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, profile_text: profileText })
      })

      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.detail || 'Failed to match profile.')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" id="matchmaker-drawer" style={{ width: 500 }}>
        
        <div className="drawer-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="liquid-glass" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                ✨
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', margin: 0 }}>Career Matchmaker</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Find your perfect sponsors</div>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost" style={{ fontSize: 20, padding: '2px 8px' }}>✕</button>
          </div>
        </div>

        {!result && (
          <Section title="Your Profile">
            <div style={{ fontSize: 14, color: 'var(--text-main)', marginBottom: 16 }}>
              Paste your resume text or describe your skills and interests below. AI will scan your entire network to find the absolute best people for you to reach out to.
            </div>
            <textarea 
              value={profileText}
              onChange={e => setProfileText(e.target.value)}
              placeholder="e.g. I am a fresh graduate who knows React, Tailwind, and Node.js. I'm looking for a junior frontend role in a fast-paced startup..."
              style={{
                width: '100%',
                height: 200,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                marginBottom: 16,
                lineHeight: 1.5,
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            {error && (
              <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16, background: 'rgba(248,113,113,0.1)', padding: '12px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            <button 
              className="btn btn-primary liquid-glass" 
              onClick={handleMatch}
              disabled={loading || !profileText.trim()}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing Network...</>
              ) : (
                'Find My Matches'
              )}
            </button>
          </Section>
        )}

        {result && (
          <div className="anim-in">
            <div style={{ padding: '24px', background: 'rgba(52,211,153,0.05)', borderBottom: '1px solid rgba(52,211,153,0.1)' }}>
              <div className="eyebrow" style={{ color: 'var(--accent-emerald)', marginBottom: 8 }}>AI Profile Summary</div>
              <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.5 }}>
                "{result.summary}"
              </div>
              <button className="btn-ghost" onClick={() => setResult(null)} style={{ marginTop: 16, fontSize: 12, padding: '4px 0' }}>
                ← Edit Profile
              </button>
            </div>

            <Section title={`Top ${result.matches.length} Recommended Contacts`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {result.matches.map((c, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 16,
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                      <div className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{c.full_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {c.job_title_clean} {c.company && `at ${c.company}`}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 8, padding: 12, marginBottom: 12,
                      borderLeft: '2px solid var(--accent-emerald)'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        Why Them?
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.4 }}>
                        {c.reason}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 8, padding: 12, marginBottom: 16,
                      borderLeft: '2px solid var(--accent-blue)'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        Suggested Icebreaker
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-main)', fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{c.icebreaker}"
                      </div>
                    </div>

                    <button 
                      className="btn btn-outline w-full" 
                      onClick={() => onMessage(c)}
                      style={{ justifyContent: 'center' }}
                    >
                      ✉️ Draft Message
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

      </aside>
    </>
  )
}
