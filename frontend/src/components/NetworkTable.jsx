import { useState, useMemo } from 'react'

/* ── Badge / Tag / Seniority class maps ──────────────────────── */
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
const SENIORITY_DOT_CLS = {
  'Intern':    'seniority-dot-intern',
  'Junior':    'seniority-dot-junior',
  'Mid-level': 'seniority-dot-mid',
  'Senior':    'seniority-dot-senior',
  'Lead':      'seniority-dot-lead',
  'Executive': 'seniority-dot-exec',
}

const PAGE = 50

/* ── Truncated cell text with native tooltip ─────────────────── */
function Cell({ children, style = {}, title }) {
  return (
    <div title={title || (typeof children === 'string' ? children : undefined)} style={{
      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', ...style,
    }}>
      {children}
    </div>
  )
}

export default function NetworkTable({ connections, onContact }) {
  const [sort, setSort] = useState({ key: 'score', dir: -1 })
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    return [...connections].sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.dir
    })
  }, [connections, sort])

  const paginated = sorted.slice(0, (page + 1) * PAGE)
  const hasMore   = paginated.length < sorted.length

  const toggleSort = (k) => {
    setSort(s => s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: -1 })
    setPage(0)
  }

  function Th({ label, col, width }) {
    const active = sort.key === col
    return (
      <th onClick={() => toggleSort(col)} className={active ? 'sorted' : ''} style={{ width, minWidth: width }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {active && <span style={{ color: 'var(--accent-emerald)', fontSize: 12 }}>{sort.dir === -1 ? '↓' : '↑'}</span>}
        </div>
      </th>
    )
  }

  if (!connections.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-faint)' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🪐</div>
      <div className="font-display" style={{ fontSize: 24, color: 'var(--text-main)', marginBottom: 8 }}>Empty Space</div>
      <div style={{ fontSize: 14 }}>Try adjusting your filters or search query to explore your network.</div>
    </div>
  )

  return (
    <div>
      {/* Meta row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)' }}>{connections.length}</strong> connections
          <span style={{ fontSize: 12, marginLeft: 12, color: 'var(--text-faint)', letterSpacing: '0.02em' }}>
            Click a row to open dossier
          </span>
        </span>
      </div>

      {/* Table with fixed layout */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 420px)' }}>
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 260 }} />  {/* Name */}
            <col style={{ width: 220 }} />  {/* Title */}
            <col style={{ width: 160 }} />  {/* Company */}
            <col style={{ width: 160 }} />  {/* Category */}
            <col style={{ width: 120 }} />  {/* Seniority */}
            <col style={{ width: 220 }} />  {/* Tags */}
            <col style={{ width: 80  }} />  {/* Score */}
          </colgroup>
          <thead>
            <tr>
              <Th label="Agent Name" col="full_name"       />
              <Th label="Role"       col="job_title_clean" />
              <Th label="Affiliation"col="company"         />
              <Th label="Sector"     col="category"        />
              <Th label="Level"      col="seniority"       />
              <Th label="Attributes" col="tags"            />
              <Th label="Score"      col="score"           />
            </tr>
          </thead>
          <tbody>
            {paginated.map((c, i) => {
              const title   = c.job_title_clean || c.job_title_raw || ''
              const company = c.company || ''
              const score   = c.score ?? 0
              const scorePct = Math.round(score * 100)
              const scoreClass = score > 0.7 ? 'score-high' : score > 0.4 ? 'score-mid' : 'score-low'

              const ageDays = (() => {
                if (!c.connected_on || c.connected_on === 'nan') return null
                const d = new Date(c.connected_on)
                return isNaN(d) ? null : Math.floor((Date.now() - d) / 86400000)
              })()
              const freshBadge = ageDays !== null && ageDays <= 90
                ? { label: 'NEW', color: '#34d399', bg: 'rgba(52,211,153,0.1)' }
                : ageDays !== null && ageDays >= 730
                ? { label: 'COLD', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' }
                : null

              return (
                <tr key={c.id ?? i} onClick={() => onContact(c)}>

                  {/* ── Name + Avatar ── */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                        {c.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Cell title={c.full_name} style={{ fontWeight: 600, fontSize: 14, color: '#fff', letterSpacing: '0.02em' }}>
                            {c.full_name}
                          </Cell>
                          {freshBadge && (
                            <span title={ageDays <= 90 ? `Connected ${ageDays} days ago` : `Connected ${Math.floor(ageDays/365)} year(s) ago`}
                              style={{
                                fontSize: 9, borderRadius: 20, padding: '2px 6px', flexShrink: 0,
                                background: freshBadge.bg, color: freshBadge.color, fontWeight: 700, letterSpacing: '0.05em',
                                border: `1px solid ${freshBadge.color}40`,
                              }}>
                              {freshBadge.label}
                            </span>
                          )}
                        </div>
                        {c.email && (
                          <Cell style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'monospace', marginTop: 2 }}>
                            {c.email}
                          </Cell>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ── Title ── */}
                  <td>
                    <Cell title={title} style={{ fontSize: 13, color: 'var(--text-main)' }}>
                      {title}
                    </Cell>
                  </td>

                  {/* ── Company ── */}
                  <td>
                    <Cell title={company} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                      {company}
                    </Cell>
                  </td>

                  {/* ── Category badge ── */}
                  <td>
                    <span className={`badge ${BADGE_CLASS[c.category] || 'badge-other'}`}
                      style={{ fontSize: 10, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', whiteSpace: 'nowrap' }}>
                      {c.category}
                    </span>
                  </td>

                  {/* ── Seniority dot ── */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`seniority-dot ${SENIORITY_DOT_CLS[c.seniority] || 'seniority-dot-mid'}`} />
                      <span style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {c.seniority}
                      </span>
                    </div>
                  </td>

                  {/* ── Tags ── */}
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                      {(c.tags || []).slice(0, 3).map(t => (
                        <span key={t} className={`tag ${TAG_CLASS[t] || 'tag-tech'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                          {t}
                        </span>
                      ))}
                      {(c.tags || []).length > 3 && (
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0, alignSelf: 'center', fontWeight: 600 }}>
                          +{c.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ── Score ── */}
                  <td style={{ textAlign: 'right' }}>
                    <span className={`score-pill ${scoreClass}`}>{scorePct}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Show more */}
      {hasMore && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
          <button className="btn btn-outline" onClick={() => setPage(p => p + 1)} style={{ fontSize: 13, borderRadius: 20 }}>
            Load {Math.min(PAGE, sorted.length - paginated.length)} more logs
          </button>
        </div>
      )}
    </div>
  )
}
