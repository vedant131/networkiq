import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Check, Upload, Smartphone, QrCode } from 'lucide-react'

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const BASE     = import.meta.env.BASE_URL
const WA_NUM   = '+1 415 523 8886'
const WA_CMD   = 'join sometime-certainly'
const WA_LINK  = `https://wa.me/14155238886?text=join%20sometime-certainly`
const QR_URL   = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(WA_LINK)}&margin=10&bgcolor=ffffff&color=000000`
const DISPLAY  = "'Instrument Serif', serif"

/* ─── UPLOAD WIDGET (dark, standalone) ───────────────────────────────────── */
function UploadWidget({ onUpload }) {
  const [step, setStep]     = useState(1)
  const [file, setFile]     = useState(null)
  const [phone, setPhone]   = useState('')
  const [drag, setDrag]     = useState(false)
  const [err, setErr]       = useState('')
  const [busy, setBusy]     = useState(false)
  const ref = useRef()

  const pick = (f) => {
    const n = f.name.toLowerCase()
    if (!n.endsWith('.csv') && !n.endsWith('.zip')) {
      alert('Please upload a LinkedIn ZIP archive or Connections.csv')
      return
    }
    setFile(f); setStep(2)
  }

  const submit = async () => {
    const d = phone.replace(/\D/g, '')
    if (d.length < 10) { setErr('Enter a valid number with country code (min 10 digits)'); return }
    setErr(''); setBusy(true)
    try { await onUpload(file, phone.trim()) } finally { setBusy(false) }
  }

  if (step === 1) return (
    <div className="flex flex-col gap-4">
      {/* Option cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📦', label: 'ZIP — Recommended', note: 'LinkedIn → Settings → Data Privacy → Get a copy → Upload here', accent: true },
          { icon: '📄', label: 'CSV only', note: 'Extract ZIP, find Connections.csv, upload that file', accent: false },
        ].map(o => (
          <div key={o.label} className="rounded-xl p-4 relative"
            style={{ background: o.accent ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${o.accent ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}` }}>
            {o.accent && <span className="absolute -top-2.5 left-3 bg-white text-black text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">RECOMMENDED</span>}
            <div className="text-2xl mb-2">{o.icon}</div>
            <div className="text-white text-xs font-semibold mb-1">{o.label}</div>
            <div className="text-white/40 text-[10px] leading-relaxed">{o.note}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]) }}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{ border: `2px dashed ${drag ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`, background: drag ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }}
      >
        <Upload size={32} className="mx-auto mb-3 text-white/40" />
        <div className="text-white font-medium text-sm mb-1">{drag ? 'Release to upload' : 'Drop your LinkedIn ZIP or CSV'}</div>
        <div className="text-white/30 text-xs mb-5">Complete_LinkedInDataExport_*.zip or Connections.csv</div>
        <button onClick={e => { e.stopPropagation(); ref.current?.click() }}
          className="liquid-glass rounded-full px-6 py-2 text-white text-sm hover:scale-[1.03] transition-transform">
          Choose File
        </button>
        <input ref={ref} type="file" accept=".csv,.zip" hidden onChange={e => { if (e.target.files[0]) pick(e.target.files[0]) }} />
      </div>
      <p className="text-white/25 text-[11px] text-center">🔒 Private &amp; secure — never sold or shared</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* File confirmed */}
      <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
        <Check size={18} className="text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-emerald-400 text-xs font-semibold">File ready</div>
          <div className="text-white/50 text-[11px] truncate">{file?.name}</div>
        </div>
        <button onClick={() => { setFile(null); setStep(1) }} className="text-white/30 hover:text-white/60 text-xs transition-colors">✕ Change</button>
      </div>

      {/* Activation reminder */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Activate the bot first</p>
        <p className="text-white/50 text-[11px] leading-relaxed">
          From WhatsApp, text <span className="font-mono text-emerald-400 font-bold">{WA_CMD}</span> to <strong className="text-white">{WA_NUM}</strong> before uploading.
        </p>
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
          Open WhatsApp <ArrowRight size={10} />
        </a>
      </div>

      {/* Phone */}
      <div>
        <label className="text-white/50 text-xs font-medium block mb-2">WhatsApp Number (with country code)</label>
        <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setErr('') }}
          placeholder="+91 98765 43210"
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${err ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}` }}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        {err && <p className="text-red-400 text-[11px] mt-1.5">⚠️ {err}</p>}
      </div>

      {/* After connecting tips */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-white/40 text-[10px] font-semibold mb-2 uppercase tracking-wider">After connecting, try:</p>
        {['"find recruiters at Google"', '"Enrich Priya Sharma"', '"stats"', '"who works at Stripe"'].map(c => (
          <div key={c} className="text-white/40 text-[11px] font-mono py-1 border-b border-white/5 last:border-0">{c}</div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy}
          className="flex-1 liquid-glass rounded-xl py-3.5 text-white text-sm font-semibold hover:scale-[1.02] transition-transform disabled:opacity-60">
          {busy ? '⏳ Uploading…' : '🚀 Upload & Connect WhatsApp'}
        </button>
        <button onClick={() => onUpload(file, '')}
          className="rounded-xl px-4 text-white/40 text-sm hover:text-white/70 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          Skip
        </button>
      </div>
    </div>
  )
}

/* ─── STEP CARD ──────────────────────────────────────────────────────────── */
function StepCard({ n, icon: Icon, title, desc, delay }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className="flex flex-col gap-4 p-8 rounded-3xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center liquid-glass">
          <Icon size={18} className="text-white/70" />
        </div>
        <span className="text-white/25 text-sm font-mono">0{n}</span>
      </div>
      <div>
        <h3 className="text-white font-semibold text-lg mb-2" style={{ fontFamily: DISPLAY }}>{title}</h3>
        <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  )
}

/* ─── FEATURE ROW ────────────────────────────────────────────────────────── */
function FeatureRow({ items }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ icon, title, desc, color }, i) => (
        <motion.div key={title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
          className="rounded-2xl p-5 flex flex-col gap-2 group cursor-default transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color + '44'; e.currentTarget.style.background = color + '10' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        >
          <span className="text-2xl">{icon}</span>
          <div className="text-white text-sm font-semibold">{title}</div>
          <div className="text-white/35 text-xs leading-relaxed">{desc}</div>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function LandingPage({ onUpload }) {
  const [copied, setCopied] = useState(null)
  const [qrLoaded, setQrLoaded] = useState(false)

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000) })
  }

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — fullscreen video + glassmorphic nav + cinematic heading
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative h-screen overflow-hidden">

        {/* Video background */}
        <video autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
        />
        {/* Subtle dark scrim */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/20 to-black/70 pointer-events-none" />

        {/* ── Navigation ── */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-8 py-6 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={BASE + 'logo.svg'} alt="NetWorkIQ" className="h-8 md:h-9" style={{ filter: 'brightness(1.2) drop-shadow(0 0 8px rgba(0,229,255,0.3))' }} />
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 lg:gap-12">
            {[
              { label: 'How it works', href: '#how' },
              { label: 'Features',     href: '#features' },
              { label: 'Upload Data',  href: '#upload' },
              { label: 'Connect Bot',  href: '#connect' },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="text-sm transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              >{label}</a>
            ))}
          </div>

          {/* CTA */}
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            className="liquid-glass rounded-full px-5 py-2.5 text-sm text-white hover:scale-[1.03] transition-transform hidden sm:block">
            Begin Journey
          </a>
        </nav>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 h-[calc(100vh-88px)]">
          <h1 className="animate-fade-rise text-5xl sm:text-7xl md:text-8xl font-normal leading-[0.95] tracking-[-2px] max-w-6xl"
            style={{ fontFamily: DISPLAY, letterSpacing: '-2.46px' }}>
            Where your{' '}
            <em className="not-italic" style={{ color: 'rgba(255,255,255,0.45)' }}>network</em>{' '}
            becomes{' '}
            <em className="not-italic" style={{ color: 'rgba(255,255,255,0.45)' }}>intelligence.</em>
          </h1>

          <p className="animate-fade-rise-delay text-white/55 text-base sm:text-lg max-w-xl mt-8 leading-relaxed">
            Upload your LinkedIn data once. Query anyone, enrich anyone, and discover 500M+ prospects — all from WhatsApp. No app. No friction. Just results.
          </p>

          <a href="#upload" className="animate-fade-rise-delay-2 liquid-glass rounded-full px-14 py-5 text-base text-white mt-12 hover:scale-[1.03] transition-transform cursor-pointer inline-block">
            Upload &amp; Connect →
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS — 3 clear steps
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how" className="py-28 md:py-36 px-6" style={{ background: '#000' }}>
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">Simple 3-step process</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal leading-[0.95]" style={{ fontFamily: DISPLAY }}>
              How it <em className="not-italic text-white/40">works.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard n={1} icon={Upload} delay={0}
              title="Upload your LinkedIn data"
              desc="Export your LinkedIn connections as a ZIP or CSV file. Drop it here — takes under 10 seconds. Your data is private and never shared."
            />
            <StepCard n={2} icon={Smartphone} delay={0.15}
              title="Enter your WhatsApp number"
              desc="Link your WhatsApp number. First text 'join sometime-certainly' to +1 415 523 8886 to activate the Twilio sandbox bot."
            />
            <StepCard n={3} icon={QrCode} delay={0.3}
              title="Scan QR or text the bot"
              desc="Scan the QR code to open WhatsApp instantly. Then ask anything — find people, get emails, discover leads from 500M+ prospects."
            />
          </div>

          {/* Visual connector arrows on desktop */}
          <div className="hidden md:flex justify-center items-center gap-8 mt-8 text-white/15 text-2xl">
            <span>↑ Step 1</span><span className="text-white/8">────</span>
            <span>↑ Step 2</span><span className="text-white/8">────</span>
            <span>↑ Step 3</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          UPLOAD + CONNECT — main action area
      ══════════════════════════════════════════════════════════════════ */}
      <section id="upload" className="py-20 px-6" style={{ background: '#080808' }}>
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">Get started now</p>
            <h2 className="text-4xl md:text-5xl font-normal" style={{ fontFamily: DISPLAY }}>
              Connect in <em className="not-italic text-white/40">60 seconds.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">

            {/* Upload card */}
            <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, rgba(10,102,194,0.35), rgba(52,211,153,0.15))', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="font-semibold text-white text-base">📁 Steps 1 &amp; 2 — Upload &amp; Link</div>
                <div className="text-white/45 text-sm mt-1">Upload your LinkedIn data, then link your WhatsApp</div>
              </div>
              <div className="p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <UploadWidget onUpload={onUpload} />
              </div>
            </div>

            {/* Right column: QR + manual */}
            <div className="flex flex-col gap-4" id="connect">

              {/* QR card */}
              <div className="rounded-3xl p-7 text-center flex-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-5">Step 3 — Scan to Activate Bot</p>
                <div className="w-48 h-48 mx-auto mb-5 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: '#fff', boxShadow: '0 0 0 3px rgba(52,211,153,0.35), 0 16px 60px rgba(0,0,0,0.6)' }}>
                  {!qrLoaded && <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-white/30 text-xs">Loading…</div>}
                  <img src={QR_URL} alt="WhatsApp QR" width={176} height={176}
                    style={{ display: 'block', borderRadius: 8, opacity: qrLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
                    onLoad={() => setQrLoaded(true)} />
                </div>
                <p className="text-white/40 text-sm mb-5">Scan → WhatsApp opens → tap <strong className="text-emerald-400">Send</strong></p>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="liquid-glass rounded-full px-6 py-2.5 text-white text-sm hover:scale-[1.03] transition-transform inline-block">
                  💬 Open WhatsApp Directly →
                </a>
              </div>

              {/* Manual card */}
              <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Or text manually</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Number', value: WA_NUM, key: 'num', mono: false },
                    { label: 'Message (no spaces in "sometime-certainly")', value: WA_CMD, key: 'cmd', mono: true },
                  ].map(({ label, value, key, mono }) => (
                    <div key={key}>
                      <div className="text-white/30 text-[10px] mb-1.5">{label}</div>
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 text-sm font-semibold ${mono ? 'font-mono text-emerald-400' : 'text-white'}`} style={mono ? { background: 'rgba(52,211,153,0.08)', padding: '4px 10px', borderRadius: 6 } : {}}>{value}</span>
                        <button onClick={() => copy(value, key)}
                          className="rounded-lg px-2.5 py-1.5 text-xs transition-all"
                          style={{ background: copied === key ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', color: copied === key ? '#34d399' : 'rgba(255,255,255,0.4)', border: `1px solid ${copied === key ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                          {copied === key ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-28 px-6" style={{ background: '#000' }}>
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">What the bot can do</p>
            <h2 className="text-4xl md:text-5xl font-normal leading-[0.95]" style={{ fontFamily: DISPLAY }}>
              Network intelligence,{' '}
              <em className="not-italic text-white/40">redefined.</em>
            </h2>
            <p className="text-white/40 text-base mt-5 max-w-xl mx-auto leading-relaxed">
              Ask anything from WhatsApp. No app install. No dashboard. Just results — instantly.
            </p>
          </div>

          <FeatureRow items={[
            { icon: '🔍', title: 'Smart Search',       color: '#4fa3ff', desc: '"find recruiters at Google", "show senior engineers in India"' },
            { icon: '📧', title: 'Email Finder',        color: '#34d399', desc: 'Hunter → Apollo → Snov → PDL waterfall enrichment' },
            { icon: '🌐', title: 'Vibe Prospecting',    color: '#c084fc', desc: '500M+ cold B2B leads beyond your own network' },
            { icon: '👤', title: 'Full Profile Card',   color: '#fbbf24', desc: 'LinkedIn, GitHub, Twitter, career history & education' },
          ]} />

          <div className="mt-3">
            <FeatureRow items={[
              { icon: '📊', title: 'Network Stats',       color: '#38bdf8', desc: 'Text "stats" for instant breakdown by role & company' },
              { icon: '⚡', title: 'Instant on WhatsApp', color: '#34d399', desc: 'No app install. 24/7. Any device.' },
              { icon: '🔒', title: 'Private & Secure',    color: '#f87171', desc: 'Your data stays yours — never sold, never shared' },
              { icon: '🤖', title: 'AI Classification',   color: '#c084fc', desc: 'Automatic tagging by seniority, role, industry' },
            ]} />
          </div>

          {/* Example commands strip */}
          <div className="mt-12 rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-5 text-center">Example WhatsApp commands</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {[
                '🔍 "find recruiters at Google"',
                '📧 "Enrich Priya Sharma"',
                '🏢 "top companies in my network"',
                '📊 "stats"',
                '🌐 "who works at Stripe"',
                '👤 "show senior engineers in Bangalore"',
              ].map(c => (
                <div key={c} className="text-white/50 text-xs font-mono px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          DISCLAIMER
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-12 px-6" style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto rounded-2xl p-6" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex gap-4">
            <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-amber-400 text-sm font-semibold mb-2">Data Disclaimer</p>
              <ul className="text-white/40 text-xs leading-[2.1] list-disc ml-3">
                <li><strong className="text-white/65">Third-party data</strong> — PDL, Hunter.io, Apollo &amp; Explorium. Not always 100% accurate.</li>
                <li><strong className="text-white/65">Some people won't be found</strong> — not everyone is indexed in these databases.</li>
                <li><strong className="text-white/65">Verify before outreach</strong> — always confirm emails are correct before messaging.</li>
                <li><strong className="text-white/65">Your LinkedIn data is private</strong> — securely stored, never sold or shared.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="py-10 px-6 text-center" style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <img src={BASE + 'logo.svg'} alt="NetWorkIQ" className="h-8 mx-auto mb-4 opacity-50" />
        <p className="text-white/25 text-xs">
          Built by{' '}
          <a href="https://www.linkedin.com/in/vedant-shinde-hello/" target="_blank" rel="noopener noreferrer"
            className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
            Vedant Shinde ↗
          </a>
          {' · '}Powered by PDL · Hunter.io · Apollo · Explorium
        </p>
        <p className="text-white/15 text-[10px] mt-2">
          Data sourced from third-party databases. Not always 100% accurate.
        </p>
      </footer>
    </div>
  )
}
