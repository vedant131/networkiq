import { useState, useRef } from 'react'

/* ─── WhatsApp details ─────────────────────────────────────────────────────── */
const WA_NUMBER  = '+1 415 523 8886'
const WA_COMMAND = 'join sometime-certainly'
const WA_LINK    = `https://wa.me/14155238886?text=join%20sometime-certainly`
const QR_URL     = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(WA_LINK)}&margin=8&bgcolor=0d1b3e&color=ffffff`

const FEATURES = [
  { icon: '🔍', title: 'Smart Search',       color: '#4fa3ff', desc: '"find recruiters at Google", "show senior engineers in India"' },
  { icon: '📧', title: 'Email Finder',        color: '#4ade80', desc: 'Waterfall: Hunter → Apollo → Snov → PDL enrichment' },
  { icon: '🌐', title: 'Vibe Prospecting',    color: '#c084fc', desc: '500M+ cold B2B leads beyond your own network' },
  { icon: '👤', title: 'Full Profile Card',   color: '#fbbf24', desc: 'LinkedIn, Twitter, GitHub, career history & education' },
  { icon: '📊', title: 'Network Stats',       color: '#38bdf8', desc: 'Text "stats" — instant breakdown by role & company' },
  { icon: '⚡', title: 'Instant on WhatsApp', color: '#34d399', desc: 'No app install — just text, 24/7, any device' },
]

/* ─── Dark upload widget (self-contained, matches dark theme) ─────────────── */
function DarkUploadWidget({ onUpload }) {
  const [step, setStep]             = useState(1) // 1=file, 2=phone
  const [isDragging, setDragging]   = useState(false)
  const [fileName, setFileName]     = useState(null)
  const [selectedFile, setSelected] = useState(null)
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')
  const inputRef = useRef()

  const pickFile = (file) => {
    const ok = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.zip')
    if (!ok) { alert('Please upload LinkedIn ZIP or Connections.csv'); return }
    setFileName(file.name); setSelected(file); setStep(2)
  }

  const handleSubmit = () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { setPhoneError('Enter a valid phone number (min 10 digits)'); return }
    setPhoneError('')
    onUpload(selectedFile, phone.trim())
  }

  // ── Step 1: Pick file ──────────────────────────────────────────────────
  if (step === 1) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: '📦 ZIP (recommended)', steps: ['LinkedIn → Settings & Privacy', 'Data Privacy → Get a copy', 'Select Connections → Request', 'Upload ZIP here ✓'] },
          { label: '📄 CSV only',          steps: ['Extract the ZIP file', 'Find the Connections file', 'Upload that file here', '(less contact data)'] },
        ].map((opt, idx) => (
          <div key={idx} style={{
            background: idx === 0 ? 'rgba(79,163,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${idx === 0 ? 'rgba(79,163,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, padding: '12px 14px', position: 'relative',
          }}>
            {idx === 0 && (
              <span style={{ position: 'absolute', top: -9, left: 10, background: '#0A66C2', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, letterSpacing: 0.5 }}>RECOMMENDED</span>
            )}
            <div style={{ fontWeight: 700, fontSize: 12, color: '#fff', marginBottom: 8 }}>{opt.label}</div>
            {opt.steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                <span style={{ color: '#4fa3ff', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{i+1}.</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f) }}
        style={{
          border: `2px dashed ${isDragging ? 'rgba(52,211,153,0.7)' : 'rgba(255,255,255,0.18)'}`,
          borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
          background: isDragging ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>{isDragging ? '📂' : '📁'}</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 4 }}>
          {isDragging ? 'Release to upload' : 'Drop your LinkedIn ZIP or CSV here'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          Accepts: <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Complete_LinkedInDataExport_*.zip</strong> or <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Connections.csv</strong>
        </div>
        <button
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          style={{ background: 'linear-gradient(135deg,#0A66C2,#0052a3)', color: '#fff', border: 'none', borderRadius: 20, padding: '9px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          📎 Choose File
        </button>
        <input ref={inputRef} type="file" accept=".csv,.zip" hidden onChange={e => { if (e.target.files[0]) pickFile(e.target.files[0]) }} />
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        🔒 Your data is private — never sold or shared
      </div>
    </div>
  )

  // ── Step 2: Enter phone + activate ────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* File confirmed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '10px 14px' }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#34d399', fontSize: 13 }}>File selected</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{fileName}</div>
        </div>
        <button onClick={() => { setStep(1); setFileName(null); setSelected(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}>Change ✕</button>
      </div>

      {/* WhatsApp activation notice */}
      <div style={{ background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24', marginBottom: 6 }}>⚠️ Activate the bot first (if not done)</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>Text <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>join sometime-certainly</strong> to <strong style={{ color: '#fff' }}>+1 415 523 8886</strong> from WhatsApp</div>
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          💬 Open WhatsApp →
        </a>
      </div>

      {/* Phone input */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6 }}>
          Your WhatsApp Number (with country code)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setPhoneError('') }}
          placeholder="+91 98765 43210"
          style={{
            width: '100%', padding: '10px 14px', fontSize: 15, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${phoneError ? '#f87171' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 10, outline: 'none', color: '#fff', fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = '#34d399'}
          onBlur={e => e.target.style.borderColor = phoneError ? '#f87171' : 'rgba(255,255,255,0.2)'}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        {phoneError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>⚠️ {phoneError}</div>}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSubmit}
          style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          🚀 Upload &amp; Connect WhatsApp
        </button>
        <button
          onClick={() => onUpload(selectedFile, '')}
          style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}

/* ─── Main landing page ────────────────────────────────────────────────────── */
export default function LandingPage({ onUpload }) {
  const [qrLoaded, setQrLoad] = useState(false)
  const [copied, setCopied]   = useState(null)

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000) })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'inherit' }}>

      {/* ══ HERO + 3-STEP FLOW ════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0a0f1e 0%,#0d1b3e 60%,#0a1628 100%)',
        padding: '52px 24px 48px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ position:'absolute', top:-80, left:'15%', width:400, height:400, borderRadius:'50%', background:'rgba(10,102,194,0.15)', filter:'blur(90px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, right:'15%', width:320, height:320, borderRadius:'50%', background:'rgba(37,211,102,0.09)', filter:'blur(70px)', pointerEvents:'none' }} />

        <div style={{ position:'relative', maxWidth:720, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:99, padding:'5px 14px', marginBottom:22, fontSize:12, color:'#34d399', fontWeight:600 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#34d399', display:'inline-block', boxShadow:'0 0 8px #34d399', animation:'pulse 2s infinite' }} />
            WhatsApp AI Bot — Live Now
          </div>

          <h1 style={{ fontSize:'clamp(30px,5vw,56px)', fontWeight:900, lineHeight:1.1, marginBottom:14, letterSpacing:'-1.5px' }}>
            Your LinkedIn Network,{' '}
            <span style={{ background:'linear-gradient(90deg,#4fa3ff,#34d399,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Searchable on WhatsApp
            </span>
          </h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:36, maxWidth:520, margin:'0 auto 36px' }}>
            Upload your LinkedIn data once. Text the AI bot anytime to find people, get emails &amp; discover new leads.
          </p>

          {/* 3-step flow */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', gap:0 }}>
            {[
              { n:'1', icon:'📁', label:'Upload LinkedIn file' },
              { n:'2', icon:'📱', label:'Enter your number' },
              { n:'3', icon:'💬', label:'Scan QR or text bot' },
            ].map((s, i) => (
              <div key={s.n} style={{ display:'flex', alignItems:'center' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, width:110 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:i===0?'linear-gradient(135deg,#0A66C2,#34d399)':'rgba(255,255,255,0.08)', border:`2px solid ${i===0?'transparent':'rgba(255,255,255,0.12)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{s.icon}</div>
                  <span style={{ fontSize:12, color:i===0?'#fff':'rgba(255,255,255,0.45)', lineHeight:1.3, textAlign:'center' }}>{s.label}</span>
                </div>
                {i<2 && <div style={{ width:40, height:1, background:'rgba(255,255,255,0.1)', marginBottom:20, flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ UPLOAD + QR (main action area) ══════════════════════════════════ */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px 60px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(300px,1.4fr) minmax(260px,1fr)', gap:24, alignItems:'start' }}>

          {/* LEFT: Upload card */}
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ background:'linear-gradient(135deg,rgba(10,102,194,0.6),rgba(52,211,153,0.3))', padding:'16px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight:800, fontSize:15, color:'#fff', marginBottom:2 }}>📁 Step 1 &amp; 2 — Upload &amp; Connect</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>Upload your data, then link your WhatsApp number</div>
            </div>
            <div style={{ padding:'20px 22px' }}>
              <DarkUploadWidget onUpload={onUpload} />
            </div>
          </div>

          {/* RIGHT: QR + manual */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* QR */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'22px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:1, marginBottom:14 }}>STEP 3 — SCAN TO ACTIVATE BOT</div>
              <div style={{ width:168, height:168, margin:'0 auto 14px', background:'rgba(13,27,62,1)', borderRadius:14, padding:6, boxShadow:'0 0 0 3px rgba(52,211,153,0.35), 0 12px 40px rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                {!qrLoaded && <div style={{ position:'absolute', inset:0, background:'#0d1b3e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'rgba(255,255,255,0.3)' }}>Loading…</div>}
                <img src={QR_URL} alt="WhatsApp QR" width={156} height={156} style={{ display:'block', borderRadius:8, opacity:qrLoaded?1:0, transition:'opacity 0.3s' }} onLoad={() => setQrLoad(true)} />
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:12 }}>Scan → WhatsApp opens → tap <strong style={{ color:'#34d399' }}>Send</strong> ✓</div>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:700, fontSize:13, padding:'9px 18px', borderRadius:10, textDecoration:'none' }}>
                💬 Open WhatsApp →
              </a>
            </div>

            {/* Manual */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:1, marginBottom:12 }}>OR TEXT MANUALLY</div>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:5 }}>WhatsApp number</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:800, fontSize:15, color:'#fff' }}>{WA_NUMBER}</span>
                  <button onClick={() => copy(WA_NUMBER.replace(/\s/g,''), 'ph')} style={copyBtn(copied==='ph')}>{copied==='ph'?'✓':'📋'}</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:5 }}>Exact message (no spaces in "sometime-certainly")</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:'#34d399', background:'rgba(52,211,153,0.08)', padding:'5px 10px', borderRadius:6 }}>{WA_COMMAND}</span>
                  <button onClick={() => copy(WA_COMMAND, 'cmd')} style={copyBtn(copied==='cmd')}>{copied==='cmd'?'✓':'📋'}</button>
                </div>
              </div>
            </div>

            {/* Quick commands */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:1, marginBottom:10 }}>EXAMPLE COMMANDS</div>
              {['🔍 "find recruiters at Google"','📧 "Enrich Priya Sharma"','📊 "stats"','🏢 "top companies"'].map(c => (
                <div key={c} style={{ fontSize:12, fontFamily:'monospace', color:'rgba(255,255,255,0.55)', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>{c}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ FEATURES ══════════════════════════════════════════════════════ */}
        <div style={{ marginTop:64 }}>
          <Divider label="What the Bot Can Do" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'18px 20px', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=f.color+'44'; e.currentTarget.style.background=f.color+'12' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
              >
                <div style={{ fontSize:24, marginBottom:10 }}>{f.icon}</div>
                <div style={{ fontWeight:700, fontSize:13, color:'#fff', marginBottom:5 }}>{f.title}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ DISCLAIMER ════════════════════════════════════════════════════ */}
        <div style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:18, padding:'22px 26px', marginTop:40, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
            <div style={{ fontSize:20, width:40, height:40, background:'rgba(251,191,36,0.1)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>⚠️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:'#fbbf24', marginBottom:8 }}>Data Disclaimer</div>
              <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:2 }}>
                <li><strong style={{ color:'rgba(255,255,255,0.7)' }}>Third-party data</strong> — PDL, Hunter.io, Apollo & Explorium. Not always 100% accurate.</li>
                <li><strong style={{ color:'rgba(255,255,255,0.7)' }}>Some people won't be found</strong> — not everyone is indexed in these databases.</li>
                <li><strong style={{ color:'rgba(255,255,255,0.7)' }}>Verify before outreach</strong> — always check emails are correct before messaging.</li>
                <li><strong style={{ color:'rgba(255,255,255,0.7)' }}>Your data is private</strong> — stored securely, never sold or shared.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'20px 24px', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12 }}>
        NetworkIQ · Built by{' '}
        <a href="https://www.linkedin.com/in/vedant-shinde-hello/" target="_blank" rel="noopener noreferrer" style={{ color:'#34d399', textDecoration:'none' }}>Vedant Shinde ↗</a>
        <div style={{ marginTop:4 }}>Powered by PDL · Hunter.io · Apollo · Explorium</div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:1, whiteSpace:'nowrap' }}>{label}</div>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

function copyBtn(active) {
  return {
    background: active ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius:6, padding:'4px 9px', cursor:'pointer',
    color: active ? '#34d399' : 'rgba(255,255,255,0.5)', fontSize:14, transition:'all 0.15s', flexShrink:0,
  }
}
