import { useState } from 'react'
import { apiUrl } from '../api'

export default function ExportButton({ sessionId }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const exportExcel = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/export'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      if (!res.ok) throw new Error('Server error')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'my_network.xlsx'; a.style.display = 'none'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDone(true); setTimeout(() => setDone(false), 3000)
    } catch (e) {
      alert('Export failed: ' + e.message)
    } finally { setLoading(false) }
  }

  return (
    <button id="export-excel-btn" onClick={exportExcel} disabled={loading || !sessionId}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 99,
        border: `1px solid ${done ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.2)'}`,
        background: done ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
        color: done ? 'var(--accent-emerald)' : '#fff',
        fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
        cursor: loading || !sessionId ? 'not-allowed' : 'pointer',
        opacity: !sessionId ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { if (!loading && sessionId && !done) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' } }}
      onMouseLeave={e => { if (!done) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' } }}
    >
      {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Exporting…</>
       : done    ? <><i className="fi fi-rr-check"></i> Saved</>
       :           <><i className="fi fi-rr-download"></i> Export .xlsx</>}
    </button>
  )
}
