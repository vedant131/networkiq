import { useState } from 'react'
import UploadZone from './UploadZone'

/* ─── WhatsApp details ─────────────────────────────────────────────────────── */
const WA_NUMBER  = '+1 415 523 8886'
const WA_COMMAND = 'join sometime-certainly'
const WA_LINK    = `https://wa.me/14155238886?text=join%20sometime-certainly`
const QR_URL     = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(WA_LINK)}&margin=8&bgcolor=ffffff&color=000000`

/* ─── Features ─────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '🔍', title: 'Smart Search',        color: '#0A66C2', desc: '"find recruiters at Google", "show senior engineers"' },
  { icon: '📧', title: 'Email Finder',         color: '#057642', desc: 'Waterfall: Hunter → Apollo → Snov → PDL enrichment' },
  { icon: '🌐', title: 'Vibe Prospecting',     color: '#7B3FE4', desc: '500M+ cold B2B leads beyond your own network' },
  { icon: '👤', title: 'Full Profile Card',    color: '#C77700', desc: 'LinkedIn, Twitter, GitHub, career history, education' },
  { icon: '📊', title: 'Network Stats',        color: '#0073B1', desc: 'Text "stats" — instant breakdown by role & company' },
  { icon: '⚡', title: 'Instant on WhatsApp',  color: '#25D366', desc: 'No app install — just text, 24/7, any device' },
]

export default function LandingPage({ onUpload }) {
  const [copied, setCopied] = useState(null)
  const [qrLoaded, setQrLoad] = useState(false)

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'inherit' }}>

      {/* ══ HERO + UPLOAD ═══════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 60%, #0a1628 100%)',
        padding: '52px 24px 60px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -100, left: '10%', width: 480, height: 480, borderRadius: '50%', background: 'rgba(10,102,194,0.15)', filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(37,211,102,0.09)', filter: 'blur(70px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

          {/* Split: text left, upload right */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 500px)',
            gap: 48, alignItems: 'start',
          }}>

            {/* ── LEFT: Hero text + stats ─────────────────────────────────── */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
                borderRadius: 99, padding: '5px 14px', marginBottom: 24,
                fontSize: 12, color: '#25D366', fontWeight: 600,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', display: 'inline-block', boxShadow: '0 0 8px #25D366', animation: 'pulse 2s infinite' }} />
                WhatsApp AI Bot — Live
              </div>

              <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 18, letterSpacing: '-1.5px' }}>
                Your LinkedIn Network,
                <br />
                <span style={{ background: 'linear-gradient(90deg, #0A66C2, #25D366, #7B3FE4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Searchable on WhatsApp
                </span>
              </h1>

              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 460, lineHeight: 1.7, marginBottom: 36 }}>
                Upload your LinkedIn data once. Text your AI bot anytime to find people,
                get emails, and discover new leads — straight from WhatsApp.
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 36 }}>
                {[
                  { n: '500M+', l: 'Prospect DB' },
                  { n: '4',     l: 'Email APIs' },
                  { n: '24/7',  l: 'Bot Online' },
                  { n: '0',     l: 'Apps Needed' },
                ].map(({ n, l }) => (
                  <div key={l}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{n}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* WhatsApp mini-card */}
              <div style={{
                background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)',
                borderRadius: 14, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                  STEP 1 — ACTIVATE BOT FIRST
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Text to</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{WA_NUMBER}</span>
                  <button onClick={() => copy(WA_NUMBER.replace(/\s/g,''), 'phone')} style={minCopyBtn(copied==='phone')}>
                    {copied==='phone' ? '✓' : '📋'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Type</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '3px 10px', borderRadius: 6 }}>{WA_COMMAND}</span>
                  <button onClick={() => copy(WA_COMMAND, 'cmd')} style={minCopyBtn(copied==='cmd')}>
                    {copied==='cmd' ? '✓' : '📋'}
                  </button>
                </div>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 18px', borderRadius:10, textDecoration:'none' }}>
                  💬 Open WhatsApp &amp; Send →
                </a>
              </div>
            </div>

            {/* ── RIGHT: Upload form ──────────────────────────────────────── */}
            <div id="upload-section" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              backdropFilter: 'blur(12px)',
              overflow: 'hidden',
            }}>
              {/* Upload header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(10,102,194,0.6), rgba(37,211,102,0.3))',
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 3 }}>
                  📁 Step 2 — Upload Your LinkedIn Data
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  After activating the bot above, upload once and query forever
                </div>
              </div>
              {/* Dark wrapper for UploadZone */}
              <div className="dark-upload-wrapper">
                <UploadZone onUpload={onUpload} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══ QR CODE SECTION ══════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 0' }}>

        <Divider label="02 — Or Scan to Connect" />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
          gap: 20, marginBottom: 60,
        }}>
          {/* QR */}
          <div style={{ ...glassCard, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 20 }}>
              SCAN WITH CAMERA
            </div>
            <div style={{ width: 190, height: 190, margin: '0 auto 16px', background: '#fff', borderRadius: 14, padding: 7, boxShadow: '0 0 0 3px rgba(37,211,102,0.35), 0 16px 50px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {!qrLoaded && <div style={{ position: 'absolute', inset: 0, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#bbb' }}>Loading…</div>}
              <img src={QR_URL} alt="WhatsApp QR" width={176} height={176} style={{ display: 'block', borderRadius: 6, opacity: qrLoaded ? 1 : 0, transition: 'opacity 0.3s' }} onLoad={() => setQrLoad(true)} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Scan → opens WhatsApp → Tap Send ✓</div>
          </div>

          {/* Manual */}
          <div style={{ ...glassCard, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>MANUAL STEPS</div>
            {[
              { n: '1', label: 'WhatsApp number', value: WA_NUMBER,    key: 'p2', mono: false },
              { n: '2', label: 'Exact message to send', value: WA_COMMAND, key: 'c2', mono: true  },
            ].map(({ n, label, value, key, mono }) => (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#0A66C2,#25D366)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '9px 14px' }}>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: mono ? 14 : 16, color: mono ? '#25D366' : '#fff', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
                  <button onClick={() => copy(value, key)} style={minCopyBtn(copied===key)}>{copied===key ? '✓' : '📋'}</button>
                </div>
              </div>
            ))}
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(135deg,#25D366,#128C7E)', borderRadius:12, padding:'12px 20px', color:'#fff', fontWeight:700, fontSize:14, textDecoration:'none', marginTop:4 }}>
              💬 Open WhatsApp Directly →
            </a>
          </div>

          {/* Command examples */}
          <div style={{ ...glassCard }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 16 }}>EXAMPLE COMMANDS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['🔍', 'find recruiters at Google'],
                ['💻', 'show senior engineers'],
                ['👤', 'Enrich Priya Sharma'],
                ['📊', 'stats'],
                ['🏢', 'top companies'],
                ['🌐', 'who works at Stripe'],
              ].map(([em, cmd]) => (
                <button key={cmd} onClick={() => copy(cmd, cmd)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: copied===cmd ? 'rgba(37,211,102,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${copied===cmd ? 'rgba(37,211,102,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', width: '100%',
                  color: copied===cmd ? '#25D366' : 'rgba(255,255,255,0.7)', fontSize: 13, transition: 'all 0.15s',
                }}>
                  <span>{em}</span>
                  <span style={{ flex: 1, fontFamily: 'monospace' }}>"{cmd}"</span>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>{copied===cmd ? 'copied!' : 'tap to copy'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ FEATURES ═════════════════════════════════════════════════════ */}
        <Divider label="03 — What You Can Do" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14, marginBottom: 60 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '20px 22px', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=f.color+'55'; e.currentTarget.style.background=f.color+'10' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
            >
              <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ══ DISCLAIMER ═══════════════════════════════════════════════════ */}
        <div style={{ background: 'rgba(255,180,0,0.05)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: 18, padding: '24px 28px', marginBottom: 60 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ fontSize: 24, flexShrink: 0, width: 44, height: 44, background: 'rgba(255,180,0,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚠️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#FFB400', marginBottom: 8 }}>Important — Data Disclaimer</div>
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 2.1 }}>
                <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Data from third-party databases</strong> — PDL, Hunter.io, Apollo, Explorium &amp; others.</li>
                <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Not 100% accurate</strong> — emails &amp; profiles may be outdated. Always verify before outreach.</li>
                <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Some people won't be found</strong> — absence from results doesn't mean they don't exist.</li>
                <li><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Your LinkedIn data is private</strong> — stored securely, never sold or shared.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
        NetworkIQ · Built by{' '}
        <a href="https://www.linkedin.com/in/vedant-shinde-hello/" target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', textDecoration: 'none' }}>Vedant Shinde ↗</a>
        <div style={{ marginTop: 4 }}>Powered by PDL · Hunter.io · Apollo · Explorium</div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        .dark-upload-wrapper { background: transparent !important; }
        .dark-upload-wrapper > div {
          min-height: unset !important;
          background: transparent !important;
          padding: 20px !important;
        }
        .dark-upload-wrapper .li-card {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          margin-bottom: 0 !important;
        }
        .dark-upload-wrapper .li-card > div:first-child {
          border-radius: 12px !important;
        }
        .dark-upload-wrapper .upload-zone {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.15) !important;
          color: #fff !important;
        }
        .dark-upload-wrapper .upload-zone:hover {
          border-color: rgba(37,211,102,0.4) !important;
        }
      `}</style>
    </div>
  )
}

/* ── Tiny helpers ────────────────────────────────────────────────────────── */
const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 18,
  padding: '24px 24px',
  backdropFilter: 'blur(10px)',
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

function minCopyBtn(active) {
  return {
    background: active ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.07)',
    border: `1px solid ${active ? 'rgba(37,211,102,0.4)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
    color: active ? '#25D366' : 'rgba(255,255,255,0.5)', fontSize: 14,
    transition: 'all 0.15s', flexShrink: 0,
  }
}
