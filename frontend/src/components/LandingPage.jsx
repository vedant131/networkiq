import { useState, useEffect } from 'react'
import UploadZone from './UploadZone'

/* ─── WhatsApp details ─────────────────────────────────────────────────────── */
const WA_NUMBER     = '+1 415 523 8886'
const WA_COMMAND    = 'join sometime-certainly'
const WA_LINK       = `https://wa.me/14155238886?text=join%20sometime-certainly`
const QR_URL        = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(WA_LINK)}&margin=8&bgcolor=ffffff&color=000000`

/* ─── Feature definitions ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🔍',
    title: 'Smart Search',
    desc: 'Ask anything — "find recruiters at Google", "show senior engineers in India", "who works at a startup"',
    color: '#0A66C2',
    bg: 'rgba(10,102,194,0.08)',
  },
  {
    icon: '📧',
    title: 'Email Finder',
    desc: 'Type "Enrich [Name]" — we waterfall through Hunter, Apollo, Snov & PDL to find their work email.',
    color: '#057642',
    bg: 'rgba(5,118,66,0.08)',
  },
  {
    icon: '🌐',
    title: 'Vibe Prospecting',
    desc: 'Beyond your network! We pull cold B2B leads from 500M+ contacts via Explorium\'s live database.',
    color: '#7B3FE4',
    bg: 'rgba(123,63,228,0.08)',
  },
  {
    icon: '👤',
    title: 'Full Profile Card',
    desc: 'Get LinkedIn, Twitter, GitHub, location, career history, education & connections count — all in one message.',
    color: '#C77700',
    bg: 'rgba(199,119,0,0.08)',
  },
  {
    icon: '📊',
    title: 'Network Stats',
    desc: 'Text "stats" — instantly see your network breakdown by role, company, seniority and top industries.',
    color: '#0073B1',
    bg: 'rgba(0,115,177,0.08)',
  },
  {
    icon: '⚡',
    title: 'Instant via WhatsApp',
    desc: 'No app to install. Just text your bot. Available 24/7, works on any device, anywhere.',
    color: '#25D366',
    bg: 'rgba(37,211,102,0.08)',
  },
]

/* ─── Component ────────────────────────────────────────────────────────────── */
export default function LandingPage({ onUpload }) {
  const [copied, setCopied]   = useState(null)
  const [qrLoaded, setQrLoad] = useState(false)
  const [tick, setTick]       = useState(0)

  // Animated counter in hero
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 3000)
    return () => clearInterval(t)
  }, [])

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'inherit' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)',
        padding: '72px 24px 80px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: -120, left: '20%', width: 500, height: 500,
          borderRadius: '50%', background: 'rgba(10,102,194,0.15)',
          filter: 'blur(100px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, right: '15%', width: 400, height: 400,
          borderRadius: '50%', background: 'rgba(37,211,102,0.08)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
            borderRadius: 99, padding: '6px 16px', marginBottom: 28,
            fontSize: 13, color: '#25D366', fontWeight: 600,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#25D366',
              display: 'inline-block', boxShadow: '0 0 8px #25D366',
              animation: 'pulse 2s infinite',
            }} />
            WhatsApp AI Bot — Live Now
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, lineHeight: 1.1,
            marginBottom: 20, letterSpacing: '-1.5px',
          }}>
            Your LinkedIn Network,
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #0A66C2, #25D366, #7B3FE4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Searchable on WhatsApp
            </span>
          </h1>

          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 580,
            margin: '0 auto 40px', lineHeight: 1.65,
          }}>
            Upload your LinkedIn data once. Then simply text your AI bot to find the right
            people, get emails, and discover new leads — all from WhatsApp.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {[
              { n: '500M+', l: 'Prospect Database' },
              { n: '4',     l: 'Email Finder APIs' },
              { n: '24/7',  l: 'Bot Available' },
              { n: '0',     l: 'Apps to Install' },
            ].map(({ n, l }) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{n}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>

        {/* ── STEP 1: Connect WhatsApp ─────────────────────────────────────── */}
        <SectionLabel number="01" text="Connect WhatsApp" />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20, marginBottom: 80,
        }}>
          {/* QR Card */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 32, textAlign: 'center',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 20 }}>
              SCAN WITH PHONE CAMERA
            </div>

            {/* QR Code */}
            <div style={{
              width: 200, height: 200, margin: '0 auto 20px',
              background: '#fff', borderRadius: 16, padding: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 4px rgba(37,211,102,0.3), 0 20px 60px rgba(0,0,0,0.4)',
              position: 'relative', overflow: 'hidden',
            }}>
              {!qrLoaded && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#f5f5f5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#aaa',
                }}>Loading QR…</div>
              )}
              <img
                src={QR_URL}
                alt="Scan to open WhatsApp"
                width={184}
                height={184}
                style={{ display: 'block', borderRadius: 8, opacity: qrLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                onLoad={() => setQrLoad(true)}
              />
            </div>

            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Scan → WhatsApp opens →
            </div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
              borderRadius: 8, padding: '6px 14px',
              fontSize: 15, fontWeight: 700, color: '#25D366', letterSpacing: 0.5,
            }}>
              Tap Send ✓
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
              The message is pre-filled — just hit Send
            </div>
          </div>

          {/* OR — Manual Instructions Card */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 32,
            backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
              OR DO IT MANUALLY
            </div>

            {/* Step 1 */}
            <StepBox number="1" title="Open WhatsApp & start a new chat">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                padding: '10px 14px', marginTop: 8,
              }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Send message to</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>{WA_NUMBER}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(WA_NUMBER.replace(/\s/g, ''), 'phone')}
                  style={copyBtnStyle(copied === 'phone')}
                >
                  {copied === 'phone' ? '✓' : '📋'}
                </button>
              </div>
            </StepBox>

            {/* Step 2 */}
            <StepBox number="2" title="Type exactly this message & send">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(37,211,102,0.08)', border: '1.5px solid rgba(37,211,102,0.3)',
                borderRadius: 10, padding: '10px 14px', marginTop: 8,
              }}>
                <span style={{ fontSize: 20 }}>✍️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(37,211,102,0.6)', marginBottom: 2 }}>Exact command (no spaces in "sometime-certainly")</div>
                  <div style={{
                    fontSize: 17, fontWeight: 800, color: '#25D366',
                    fontFamily: 'monospace', letterSpacing: 0.5,
                  }}>{WA_COMMAND}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(WA_COMMAND, 'cmd')}
                  style={copyBtnStyle(copied === 'cmd')}
                >
                  {copied === 'cmd' ? '✓' : '📋'}
                </button>
              </div>
            </StepBox>

            {/* Step 3 */}
            <StepBox number="3" title="Upload your LinkedIn data below">
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.5 }}>
                After sending the command, scroll down to upload your LinkedIn ZIP or CSV.
                Your bot is now ready to use anytime, even after closing this page.
              </div>
            </StepBox>

            {/* Direct link */}
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                borderRadius: 12, padding: '12px 20px',
                color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: 20 }}>💬</span>
              Open WhatsApp Directly →
            </a>
          </div>
        </div>

        {/* ── STEP 2: What you can do ──────────────────────────────────────── */}
        <SectionLabel number="02" text="What the Bot Can Do" />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16, marginBottom: 80,
        }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '22px 24px',
              transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.borderColor = f.color + '55'
              e.currentTarget.style.background = f.bg
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.bg, border: `1px solid ${f.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 14,
              }}>
                {f.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Command Examples ─────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(10,102,194,0.08)', border: '1px solid rgba(10,102,194,0.2)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 80,
        }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>
            💬 Example Commands to Try
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
            Send any of these to the bot on WhatsApp after uploading your data
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              'find recruiters at Google',
              'show senior engineers',
              'who works at Microsoft',
              'Enrich Priya Sharma',
              'stats',
              'top companies',
              'find VPs in Finance',
              'show founders',
              'who are data scientists',
              'more',
            ].map(cmd => (
              <button
                key={cmd}
                onClick={() => copyToClipboard(cmd, cmd)}
                style={{
                  background: copied === cmd ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copied === cmd ? 'rgba(37,211,102,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 20, padding: '7px 16px',
                  color: copied === cmd ? '#25D366' : 'rgba(255,255,255,0.75)',
                  fontSize: 13, fontFamily: 'monospace', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {copied === cmd ? '✓ Copied' : `"${cmd}"`}
              </button>
            ))}
          </div>
        </div>

        {/* ── DISCLAIMER ──────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.25)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              fontSize: 28, flexShrink: 0, width: 48, height: 48,
              background: 'rgba(255,180,0,0.15)', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>⚠️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#FFB400', marginBottom: 10 }}>
                Important — Please Read
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>
                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Data is sourced from third-party databases</strong> (People Data Labs, Hunter.io, Apollo, Explorium and others).
                While these are industry-leading tools, please note:
              </div>
              <ul style={{
                margin: '12px 0 0', padding: '0 0 0 20px',
                fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 2,
              }}>
                <li><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Not 100% accurate</strong> — email addresses and profile data may be outdated or incorrect.</li>
                <li><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Some people won't be found</strong> — not everyone is in these databases. Absence ≠ non-existent.</li>
                <li><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Use responsibly</strong> — verify before reaching out; do not use for spam or unsolicited outreach.</li>
                <li><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Your data is private</strong> — LinkedIn connections are stored securely and never sold or shared.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── STEP 3: Upload ──────────────────────────────────────────────── */}
        <SectionLabel number="03" text="Upload Your LinkedIn Data" />
        <div id="upload-section">
          <UploadZone onUpload={onUpload} />
        </div>

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 24px', textAlign: 'center',
        color: 'rgba(255,255,255,0.25)', fontSize: 13,
      }}>
        NetworkIQ · LinkedIn Network Intelligence · Built with ❤️
        <div style={{ marginTop: 6 }}>
          Data enrichment powered by People Data Labs, Hunter.io, Apollo.io & Explorium
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function SectionLabel({ number, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.2)',
        letterSpacing: 3, fontFamily: 'monospace',
      }}>
        {number}
      </div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
        {text}
      </div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

function StepBox({ number, title, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0A66C2, #25D366)',
          color: '#fff', fontWeight: 800, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{number}</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function copyBtnStyle(active) {
  return {
    background: active ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.08)',
    border: `1px solid ${active ? 'rgba(37,211,102,0.4)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
    color: active ? '#25D366' : 'rgba(255,255,255,0.6)', fontSize: 16,
    transition: 'all 0.15s', flexShrink: 0,
  }
}
