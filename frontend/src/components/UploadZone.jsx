import { useState, useRef } from 'react'

export default function UploadZone({ onUpload, dark = false }) {
  // Colour tokens that switch between light and dark modes
  const T = dark ? {
    bg:          'transparent',
    cardBg:      'rgba(255,255,255,0.04)',
    text:        '#ffffff',
    textMuted:   'rgba(255,255,255,0.55)',
    border:      'rgba(255,255,255,0.12)',
    stepBg:      'rgba(255,255,255,0.06)',
    stepBorder:  'rgba(255,255,255,0.08)',
    inactiveDot: 'rgba(255,255,255,0.15)',
    inactiveLine:'rgba(255,255,255,0.12)',
    optionBg:    'rgba(255,255,255,0.05)',
    optionBgRec: 'rgba(10,102,194,0.15)',
    optionBorder:'rgba(255,255,255,0.12)',
    dropBg:      'rgba(255,255,255,0.04)',
    dropBorder:  'rgba(255,255,255,0.2)',
    privacyBg:   'rgba(10,102,194,0.12)',
    privacyBor:  'rgba(10,102,194,0.3)',
  } : {
    bg:          'var(--li-bg)',
    cardBg:      '#ffffff',
    text:        'var(--li-text)',
    textMuted:   'var(--li-text-2)',
    border:      'rgba(0,0,0,0.12)',
    stepBg:      '#fafafa',
    stepBorder:  'rgba(0,0,0,0.08)',
    inactiveDot: 'rgba(0,0,0,0.15)',
    inactiveLine:'rgba(0,0,0,0.12)',
    optionBg:    'var(--li-bg)',
    optionBgRec: 'rgba(10,102,194,0.04)',
    optionBorder:'rgba(0,0,0,0.12)',
    dropBg:      'var(--li-bg)',
    dropBorder:  'rgba(0,0,0,0.15)',
    privacyBg:   'rgba(10,102,194,0.06)',
    privacyBor:  'rgba(10,102,194,0.15)',
  }
  const [isDragging, setDragging]   = useState(false)
  const [fileName, setFileName]     = useState(null)
  const [selectedFile, setSelected] = useState(null)
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [step, setStep]             = useState(1) // 1 = choose file, 2 = enter phone
  const inputRef = useRef()

  // ── File selection ──────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) pickFile(file)
  }

  const pickFile = (file) => {
    const ok = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.zip')
    if (!ok) { alert('Please upload the LinkedIn ZIP file or the Connections.csv file.'); return }
    setFileName(file.name)
    setSelected(file)
    setStep(2)  // advance to phone step
  }

  // ── Phone validation ────────────────────────────────────────────────────────
  const validatePhone = (val) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length < 10) return 'Enter a valid phone number (min 10 digits)'
    return ''
  }

  // ── Final submit ────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const err = validatePhone(phone)
    if (err) { setPhoneError(err); return }
    setPhoneError('')
    // Pass both file and phone to parent
    onUpload(selectedFile, phone.trim())
  }

  const handleSkip = () => {
    // Upload without linking WhatsApp
    onUpload(selectedFile, '')
  }

  // ── Render: Step 1 — File picker ────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      {/* 2-option instructions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="anim-stagger-1">
          <OptionCard
            recommended
            icon="📦"
            title="Option 1 — Upload ZIP (recommended)"
            T={T}
            steps={[
              'LinkedIn → Settings & Privacy',
              'Data Privacy → Get a copy of your data',
              'Select "Connections" → Request archive',
              'Upload the ZIP file directly here ✓',
            ]}
          />
        </div>
        <div className="anim-stagger-2">
          <OptionCard
            icon="📄"
            title="Option 2 — Upload CSV only"
            T={T}
            steps={[
              'Extract the ZIP file',
              'Find the "Connections" file inside',
              'Upload just that file here',
              '(less contact data available)',
            ]}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        id="upload-dropzone"
        className={`upload-zone anim-stagger-3 hover-lift ${isDragging ? 'dragging' : ''}`}
        style={{ padding: '32px 24px', textAlign: 'center', background: T.dropBg, marginBottom: 16,
          border: `2px dashed ${T.dropBorder}`, borderRadius: 8 }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="icon-float" style={{ fontSize: 36, marginBottom: 10 }}>
          {isDragging ? '📂' : '📁'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>
          {isDragging
            ? <span style={{ color: 'var(--li-blue)' }}>Release to upload</span>
            : 'Drop your LinkedIn ZIP or CSV here'}
        </div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
          Accepts: <strong>Complete_LinkedInDataExport_*.zip</strong> or <strong>Connections.csv</strong>
        </div>
        <button
          id="upload-btn"
          className="btn btn-primary"
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          style={{ padding: '9px 24px', fontSize: 14 }}
        >
          📎 Choose File
        </button>
        <input ref={inputRef} type="file" accept=".csv,.zip" hidden
          onChange={e => { if (e.target.files[0]) pickFile(e.target.files[0]) }} />
      </div>
    </>
  )

  // ── Render: Step 2 — Phone number ────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="anim-in">
      {/* File confirmed banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 8,
        background: 'rgba(5,118,66,0.08)', border: '1px solid rgba(5,118,66,0.3)',
        marginBottom: 20, fontSize: 13,
      }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <div style={{ fontWeight: 600, color: '#057642' }}>File selected</div>
          <div style={{ color: 'var(--li-text-2)' }}>{fileName}</div>
        </div>
        <button
          onClick={() => { setStep(1); setFileName(null); setSelected(null) }}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--li-text-2)', fontSize: 12,
          }}
        >Change ✕</button>
      </div>

      {/* WhatsApp phone section */}
      <div style={{
        border: '2px solid #25D366',
        borderRadius: 10, overflow: 'hidden', marginBottom: 16,
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          padding: '14px 18px', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>💬</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Connect WhatsApp Bot</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Query your network anytime via WhatsApp — no app needed
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 18px 14px', background: '#fff' }}>
          <div style={{ fontSize: 13, color: 'var(--li-text-2)', marginBottom: 14, lineHeight: 1.5 }}>
            Enter your WhatsApp number to link your 24/7 AI bot.
            <div style={{ padding: '8px 12px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', marginTop: '8px', color: '#8f6e00' }}>
              <strong>⚠️ Twilio Sandbox Step:</strong> Before clicking upload, you must text <strong>join sometime-certainly</strong> to <strong>+1 415 523 8886</strong> from your WhatsApp to allow the bot to message you!
            </div>
          </div>

          {/* Phone input */}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--li-text)', marginBottom: 6 }}>
            WhatsApp Number (with country code)
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              id="whatsapp-phone-input"
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setPhoneError('') }}
              placeholder="+91 98765 43210"
              style={{
                flex: 1, padding: '10px 14px', fontSize: 15,
                border: `1.5px solid ${phoneError ? '#e74c3c' : 'rgba(0,0,0,0.2)'}`,
                borderRadius: 8, outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#25D366'}
              onBlur={e => e.target.style.borderColor = phoneError ? '#e74c3c' : 'rgba(0,0,0,0.2)'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {phoneError && (
            <div style={{ fontSize: 12, color: '#e74c3c', marginBottom: 8 }}>⚠️ {phoneError}</div>
          )}

          {/* How it works */}
          <div style={{
            background: '#f0fdf4', border: '1px solid rgba(37,211,102,0.25)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, color: '#128C7E', marginBottom: 6 }}>💡 After connecting:</div>
            {[
              '"who works at Google?" → list of Google connections',
              '"find recruiters" → all HR/talent people',
              '"stats" → your network summary',
              '"top companies" → most connected companies',
            ].map((ex, i) => (
              <div key={i} style={{ color: '#374151', marginBottom: 3 }}>
                • {ex}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              id="connect-whatsapp-btn"
              className="btn btn-primary"
              onClick={handleSubmit}
              style={{
                flex: 1, padding: '10px',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                border: 'none', fontSize: 14, fontWeight: 600,
              }}
            >
              🚀 Upload & Connect WhatsApp
            </button>
            <button
              id="skip-whatsapp-btn"
              onClick={handleSkip}
              style={{
                padding: '10px 16px', background: 'none',
                border: '1.5px solid rgba(0,0,0,0.15)',
                borderRadius: 20, cursor: 'pointer',
                fontSize: 13, color: 'var(--li-text-2)',
                whiteSpace: 'nowrap',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: dark ? 'unset' : 'calc(100vh - 52px)',
      display: 'flex', alignItems: dark ? 'flex-start' : 'center', justifyContent: 'center',
      padding: dark ? '20px' : '24px 16px', background: T.bg,
    }}>
      <div className="anim-in" style={{ maxWidth: 640, width: '100%' }}>

        {/* Main card */}
        <div className="li-card" style={{ marginBottom: 14 }}>
          {/* LinkedIn-blue cover */}
          <div style={{
            background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
            padding: '20px 28px', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0,
            }}>🔗</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>LinkedIn Network Intelligence</h1>
              <p style={{ fontSize: 13, opacity: 0.85 }}>AI classification · Natural-language search · WhatsApp bot</p>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '12px 28px', borderBottom: `1px solid ${T.stepBorder}`,
            background: T.stepBg,
          }}>
            {['Choose File', 'Connect WhatsApp'].map((label, i) => {
              const active = step === i + 1
              const done = step > i + 1
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: done ? '#057642' : active ? '#0A66C2' : T.inactiveDot,
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: active ? 700 : 400,
                      color: active ? '#0A66C2' : done ? '#057642' : T.textMuted,
                    }}>{label}</span>
                  </div>
                  {i < 1 && (
                    <div style={{
                      flex: 1, height: 1, margin: '0 12px',
                      background: done ? '#057642' : T.inactiveLine,
                    }}/>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {step === 1 ? renderStep1() : renderStep2()}
          </div>

          {/* Privacy note */}
          <div style={{
            margin: '0 28px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 6,
            background: T.privacyBg, border: `1px solid ${T.privacyBor}`,
            fontSize: 13, color: T.textMuted,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
            <span>Your data is securely processed and stored in a private database linked to your WhatsApp number. This enables your 24/7 AI Bot. We never sell or share your data.</span>
          </div>
        </div>

      </div>
    </div>
  )
}

function OptionCard({ icon, title, steps, recommended, T }) {
  return (
    <div className="hover-lift" style={{
      border: `1.5px solid ${recommended ? 'var(--li-blue)' : T.optionBorder}`,
      borderRadius: 6, padding: '12px 14px',
      background: recommended ? T.optionBgRec : T.optionBg,
      position: 'relative',
    }}>
      {recommended && (
        <span style={{
          position: 'absolute', top: -10, left: 12,
          background: 'var(--li-blue)', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
        }}>RECOMMENDED</span>
      )}
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>{title}</div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
          <span style={{ color: 'var(--li-blue)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}.</span>
          <span style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>{s}</span>
        </div>
      ))}
    </div>
  )
}
