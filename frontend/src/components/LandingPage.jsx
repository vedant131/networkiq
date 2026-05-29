import { useState } from 'react'
import UploadZone from './UploadZone'

/* ─── WhatsApp details ─────────────────────────────────────────────────────── */
const WA_LINK = `https://wa.me/14155238886?text=join%20sometime-certainly`
const QR_URL  = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(WA_LINK)}&margin=8&bgcolor=ffffff&color=000000`

const FEATURES = [
  { icon: '🔍', title: 'Smart Search',       color: '#0A66C2', desc: '"find recruiters at Google", "show senior engineers"' },
  { icon: '📧', title: 'Email Finder',        color: '#057642', desc: 'Waterfall: Hunter → Apollo → Snov → PDL enrichment' },
  { icon: '🌐', title: 'Vibe Prospecting',    color: '#7B3FE4', desc: '500M+ cold B2B leads beyond your own network' },
  { icon: '👤', title: 'Full Profile Card',   color: '#C77700', desc: 'LinkedIn, Twitter, GitHub, career history & education' },
  { icon: '📊', title: 'Network Stats',       color: '#0073B1', desc: 'Text "stats" — instant breakdown by role & company' },
  { icon: '⚡', title: 'Instant on WhatsApp', color: '#25D366', desc: 'No app install — just text, 24/7, any device' },
]

export default function LandingPage({ onUpload }) {
  const [qrLoaded, setQrLoad] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'inherit' }}>

      {/* ══ HERO (full-width) ════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 60%, #0a1628 100%)',
        padding: '52px 24px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:-80, left:'15%', width:400, height:400, borderRadius:'50%', background:'rgba(10,102,194,0.15)', filter:'blur(90px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, right:'15%', width:320, height:320, borderRadius:'50%', background:'rgba(37,211,102,0.09)', filter:'blur(70px)', pointerEvents:'none' }} />

        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:99, padding:'5px 14px', marginBottom:22, fontSize:12, color:'#25D366', fontWeight:600 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#25D366', display:'inline-block', boxShadow:'0 0 8px #25D366', animation:'pulse 2s infinite' }} />
            WhatsApp AI Bot — Live Now
          </div>

          <h1 style={{ fontSize:'clamp(32px,5vw,58px)', fontWeight:900, lineHeight:1.1, marginBottom:16, letterSpacing:'-1.5px' }}>
            Your LinkedIn Network,{' '}
            <span style={{ background:'linear-gradient(90deg,#0A66C2,#25D366,#7B3FE4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Searchable on WhatsApp
            </span>
          </h1>

          <p style={{ fontSize:17, color:'rgba(255,255,255,0.55)', lineHeight:1.7, marginBottom:32, maxWidth:540, margin:'0 auto 32px' }}>
            Upload your LinkedIn data once. Text your AI bot to find people, get emails &amp; discover new leads.
          </p>

          {/* 3-step flow indicator */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, flexWrap:'wrap' }}>
            {[
              { n:'1', label:'Upload LinkedIn file', icon:'📁' },
              { n:'2', label:'Enter your number',    icon:'📱' },
              { n:'3', label:'Text or scan the bot', icon:'💬' },
            ].map((s, i) => (
              <div key={s.n} style={{ display:'flex', alignItems:'center' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background: i===0 ? 'linear-gradient(135deg,#0A66C2,#25D366)' : 'rgba(255,255,255,0.1)', border:`2px solid ${i===0 ? 'transparent' : 'rgba(255,255,255,0.15)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', maxWidth:90, textAlign:'center', lineHeight:1.3 }}>{s.label}</span>
                </div>
                {i < 2 && <div style={{ width:48, height:1, background:'rgba(255,255,255,0.12)', margin:'0 8px', marginBottom:22, flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── UPLOAD FORM + QR SIDE BY SIDE ─────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(300px,1.3fr) minmax(240px,1fr)', gap:24, alignItems:'start', marginBottom:64 }}>

          {/* Upload card — LEFT, PROMINENT */}
          <div id="upload-section" style={{
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:20, overflow:'hidden',
            boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{ background:'linear-gradient(135deg,rgba(10,102,194,0.7),rgba(37,211,102,0.4))', padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight:800, fontSize:16, color:'#fff', marginBottom:3 }}>📁 Step 1 &amp; 2 — Upload &amp; Connect</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)' }}>Upload your LinkedIn data, then enter your WhatsApp number</div>
            </div>
            <div className="dark-upload-wrapper">
              <UploadZone onUpload={onUpload} />
            </div>
          </div>

          {/* QR + instructions — RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* QR card */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'24px', textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:1, marginBottom:14 }}>
                STEP 3 — SCAN TO ACTIVATE BOT
              </div>
              <div style={{ width:170, height:170, margin:'0 auto 14px', background:'#fff', borderRadius:14, padding:6, boxShadow:'0 0 0 3px rgba(37,211,102,0.35), 0 12px 40px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                {!qrLoaded && <div style={{ position:'absolute', inset:0, background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#bbb' }}>Loading…</div>}
                <img src={QR_URL} alt="WhatsApp QR" width={158} height={158} style={{ display:'block', borderRadius:6, opacity:qrLoaded?1:0, transition:'opacity 0.3s' }} onLoad={() => setQrLoad(true)} />
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:12, lineHeight:1.5 }}>
                Scan with camera → WhatsApp opens → tap <strong style={{ color:'#25D366' }}>Send</strong>
              </div>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 18px', borderRadius:10, textDecoration:'none' }}>
                💬 Or Open WhatsApp Directly →
              </a>
            </div>

            {/* Manual number + command */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'20px' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:1, marginBottom:12 }}>
                OR TEXT MANUALLY
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>WhatsApp number</div>
                <div style={{ fontWeight:800, fontSize:16, color:'#fff', background:'rgba(255,255,255,0.05)', padding:'8px 14px', borderRadius:8 }}>+1 415 523 8886</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Message to send (no spaces in "sometime-certainly")</div>
                <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color:'#25D366', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', padding:'8px 14px', borderRadius:8 }}>
                  join sometime-certainly
                </div>
              </div>
            </div>

            {/* Quick commands */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'20px' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:1, marginBottom:12 }}>COMMANDS TO TRY</div>
              {[
                '🔍 "find recruiters at Google"',
                '📧 "Enrich Priya Sharma"',
                '📊 "stats"',
                '🏢 "top companies"',
              ].map(c => (
                <div key={c} style={{ fontSize:13, fontFamily:'monospace', color:'rgba(255,255,255,0.6)', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>{c}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ FEATURES ═════════════════════════════════════════════════════ */}
        <Divider label="What the Bot Can Do" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:14, marginBottom:60 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'20px 22px', transition:'all 0.2s', cursor:'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=f.color+'55'; e.currentTarget.style.background=f.color+'12' }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
            >
              <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:6 }}>{f.title}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ══ DISCLAIMER ═══════════════════════════════════════════════════ */}
        <div style={{ background:'rgba(255,180,0,0.05)', border:'1px solid rgba(255,180,0,0.2)', borderRadius:18, padding:'24px 28px', marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
            <div style={{ fontSize:22, flexShrink:0, width:42, height:42, background:'rgba(255,180,0,0.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>⚠️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'#FFB400', marginBottom:8 }}>Data Disclaimer — Please Read</div>
              <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:2 }}>
                <li><strong style={{ color:'rgba(255,255,255,0.75)' }}>Third-party data</strong> — sourced from PDL, Hunter.io, Apollo & Explorium databases.</li>
                <li><strong style={{ color:'rgba(255,255,255,0.75)' }}>Not 100% accurate</strong> — emails & profiles may be outdated. Always verify before outreach.</li>
                <li><strong style={{ color:'rgba(255,255,255,0.75)' }}>Some people won't be found</strong> — not everyone is indexed in these databases.</li>
                <li><strong style={{ color:'rgba(255,255,255,0.75)' }}>Your data is private</strong> — stored securely, never sold or shared.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'22px 24px', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12 }}>
        NetworkIQ · Built by{' '}
        <a href="https://www.linkedin.com/in/vedant-shinde-hello/" target="_blank" rel="noopener noreferrer" style={{ color:'#25D366', textDecoration:'none' }}>Vedant Shinde ↗</a>
        <div style={{ marginTop:4 }}>Powered by PDL · Hunter.io · Apollo · Explorium</div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
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
        .dark-upload-wrapper .upload-zone {
          background: rgba(255,255,255,0.04) !important;
          border: 2px dashed rgba(255,255,255,0.15) !important;
          color: rgba(255,255,255,0.8) !important;
        }
        .dark-upload-wrapper .upload-zone:hover,
        .dark-upload-wrapper .upload-zone.dragging {
          border-color: rgba(37,211,102,0.5) !important;
          background: rgba(37,211,102,0.05) !important;
        }
        .dark-upload-wrapper label,
        .dark-upload-wrapper div {
          color: rgba(255,255,255,0.7);
        }
      `}</style>
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
      <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:1, whiteSpace:'nowrap' }}>{label}</div>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
    </div>
  )
}
