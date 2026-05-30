import { useState, useRef } from 'react'

export default function UploadZone({ onUpload, onRestore }) {
  const [tab, setTab]               = useState('upload') // 'upload' or 'restore'
  const [isDragging, setDragging]   = useState(false)
  const [fileName, setFileName]     = useState(null)
  const [selectedFile, setSelected] = useState(null)
  const [step, setStep]             = useState(1)
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [uploading, setUploading]   = useState(false)
  const inputRef = useRef()

  const pickFile = (file) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.zip')) {
      alert('Please upload a LinkedIn ZIP archive or Connections.csv file')
      return
    }
    setFileName(file.name)
    setSelected(file)
    setStep(2)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) pickFile(file)
  }

  const handleSubmit = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setPhoneError('Enter a valid phone number with country code (min 10 digits)')
      return
    }
    setPhoneError('')
    setUploading(true)
    try {
      await onUpload(selectedFile, phone.trim())
    } finally {
      setUploading(false)
    }
  }

  const renderStep1 = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="anim-stagger-1">
          <OptionCard
            recommended
            icon="📦"
            title="Option 1 — Upload ZIP (recommended)"
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
            steps={[
              'Extract the ZIP file',
              'Find the "Connections" file inside',
              'Upload just that file here',
              '(less contact data available)',
            ]}
          />
        </div>
      </div>

      <div
        id="upload-dropzone"
        className={`upload-zone anim-stagger-3 hover-lift ${isDragging ? 'dragging' : ''}`}
        style={{ padding: '32px 24px', textAlign: 'center', background: 'var(--li-bg)', marginBottom: 16 }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="icon-float" style={{ fontSize: 36, marginBottom: 10 }}>
          {isDragging ? '📂' : '📁'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--li-text)', marginBottom: 6 }}>
          {isDragging
            ? <span style={{ color: 'var(--li-blue)' }}>Release to upload</span>
            : 'Drop your LinkedIn ZIP or CSV here'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--li-text-2)', marginBottom: 20 }}>
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

  const renderStep2 = () => (
    <>
      <div style={{
        background: 'var(--li-green-light)', border: '1px solid var(--li-green)',
        borderRadius: 8, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--li-green)', fontSize: 13 }}>File ready to upload</div>
          <div style={{ color: 'var(--li-text-2)', fontSize: 12 }}>{fileName}</div>
        </div>
        <button
          onClick={() => { setStep(1); setFileName(null); setSelected(null) }}
          style={{ background: 'none', border: 'none', color: 'var(--li-text-2)', cursor: 'pointer', fontSize: 12 }}
        >
          Change ✕
        </button>
      </div>

      <div style={{
        background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.3)',
        borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13,
      }}>
        <strong style={{ color: '#C77700' }}>⚠️ Twilio Sandbox Step:</strong> Before clicking upload, you must text{' '}
        <strong style={{ color: 'var(--li-blue)' }}>join sometime-certainly</strong> to{' '}
        <strong>+1 415 523 8886</strong> from your WhatsApp to allow the bot to message you!
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--li-text)', display: 'block', marginBottom: 6 }}>
          WhatsApp Number (with country code)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setPhoneError('') }}
          placeholder="+91 98765 43210"
          className="li-input"
          style={{ width: '100%', fontSize: 15, boxSizing: 'border-box' }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        {phoneError && (
          <div style={{ fontSize: 12, color: 'var(--li-red)', marginTop: 4 }}>⚠️ {phoneError}</div>
        )}
      </div>

      <div style={{ background: 'var(--li-blue-tint)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--li-text-2)' }}>
        <div style={{ fontWeight: 600, color: 'var(--li-blue)', marginBottom: 6 }}>💡 After connecting:</div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', lineHeight: 2 }}>
          <li>"who works at Google?" → list of Google connections</li>
          <li>"find engineers at Stripe" → filtered results</li>
          <li>"Enrich John Smith" → full profile with email</li>
          <li>"stats" → your network breakdown</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          id="upload-connect-btn"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={uploading}
          style={{ flex: 1, padding: '11px', fontSize: 14, opacity: uploading ? 0.7 : 1 }}
        >
          {uploading ? '⏳ Uploading...' : '🚀 Upload & Connect WhatsApp'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => onUpload(selectedFile, '')}
          style={{ padding: '11px 16px', fontSize: 13 }}
        >
          Skip
        </button>
      </div>
    </>
  )

  const renderRestoreTab = () => (
    <div className="anim-stagger-1" style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--li-text)', marginBottom: 8 }}>Welcome Back!</h3>
        <p style={{ fontSize: 14, color: 'var(--li-text-2)', maxWidth: 400, margin: '0 auto' }}>
          Enter the phone number you used previously to instantly restore your dashboard and WhatsApp bot connection.
        </p>
      </div>

      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--li-text)', display: 'block', marginBottom: 6 }}>
          WhatsApp Number (with country code)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setPhoneError('') }}
          placeholder="+91 98765 43210"
          className="li-input"
          style={{ width: '100%', fontSize: 15, boxSizing: 'border-box', marginBottom: phoneError ? 4 : 20 }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const digits = phone.replace(/\D/g, '')
              if (digits.length < 10) setPhoneError('Enter a valid phone number')
              else onRestore(phone.trim())
            }
          }}
        />
        {phoneError && (
          <div style={{ fontSize: 12, color: 'var(--li-red)', marginBottom: 20 }}>⚠️ {phoneError}</div>
        )}

        <button
          className="btn btn-primary"
          onClick={() => {
            const digits = phone.replace(/\D/g, '')
            if (digits.length < 10) {
              setPhoneError('Enter a valid phone number')
              return
            }
            onRestore(phone.trim())
          }}
          disabled={uploading}
          style={{ width: '100%', padding: '12px', fontSize: 15 }}
        >
          {uploading ? '⏳ Restoring...' : '🔄 Restore My Network'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: 'calc(100vh - 52px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', background: 'var(--li-bg)',
    }}>
      <div className="anim-in" style={{ maxWidth: 640, width: '100%' }}>

        <div className="li-card" style={{ marginBottom: 14 }}>
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

          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)',
            background: '#fafafa',
          }}>
            <button
              onClick={() => setTab('upload')}
              style={{
                flex: 1, padding: '16px', border: 'none', background: tab === 'upload' ? '#fff' : 'transparent',
                borderBottom: tab === 'upload' ? '2px solid var(--li-blue)' : '2px solid transparent',
                color: tab === 'upload' ? 'var(--li-blue)' : 'var(--li-text-2)',
                fontWeight: tab === 'upload' ? 600 : 400, fontSize: 14, cursor: 'pointer',
              }}
            >
              🚀 New Upload
            </button>
            <button
              onClick={() => setTab('restore')}
              style={{
                flex: 1, padding: '16px', border: 'none', background: tab === 'restore' ? '#fff' : 'transparent',
                borderBottom: tab === 'restore' ? '2px solid var(--li-blue)' : '2px solid transparent',
                color: tab === 'restore' ? 'var(--li-blue)' : 'var(--li-text-2)',
                fontWeight: tab === 'restore' ? 600 : 400, fontSize: 14, cursor: 'pointer',
              }}
            >
              📱 Returning User
            </button>
          </div>

          {tab === 'upload' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0,
              padding: '12px 28px', borderBottom: '1px solid rgba(0,0,0,0.08)',
              background: '#fff',
            }}>
              {['Choose File', 'Connect WhatsApp'].map((label, i) => {
                const active = step === i + 1
                const done = step > i + 1
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: done ? '#057642' : active ? '#0A66C2' : 'rgba(0,0,0,0.15)',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: active ? 700 : 400,
                        color: active ? '#0A66C2' : done ? '#057642' : 'var(--li-text-2)',
                      }}>{label}</span>
                    </div>
                    {i < 1 && (
                      <div style={{
                        flex: 1, height: 1, margin: '0 12px',
                        background: done ? '#057642' : 'rgba(0,0,0,0.12)',
                      }}/>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ padding: '24px 28px', background: '#fff' }}>
            {tab === 'restore' ? renderRestoreTab() : (step === 1 ? renderStep1() : renderStep2())}
          </div>

          <div style={{
            margin: '0 28px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 6,
            background: 'rgba(10,102,194,0.06)', border: '1px solid rgba(10,102,194,0.15)',
            fontSize: 13, color: 'var(--li-text-2)',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
            <span>Your data is securely processed and stored in a private database linked to your WhatsApp number. This enables your 24/7 AI Bot. We never sell or share your data.</span>
          </div>
        </div>

      </div>
    </div>
  )
}

function OptionCard({ icon, title, steps, recommended }) {
  return (
    <div className="hover-lift" style={{
      border: `1.5px solid ${recommended ? 'var(--li-blue)' : 'rgba(0,0,0,0.12)'}`,
      borderRadius: 6, padding: '12px 14px',
      background: recommended ? 'rgba(10,102,194,0.04)' : 'var(--li-bg)',
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
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--li-text)', marginBottom: 8 }}>{title}</div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
          <span style={{ color: 'var(--li-blue)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}.</span>
          <span style={{ fontSize: 11, color: 'var(--li-text-2)', lineHeight: 1.4 }}>{s}</span>
        </div>
      ))}
    </div>
  )
}
