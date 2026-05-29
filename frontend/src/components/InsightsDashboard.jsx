import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const PALETTE = ['#34d399', '#4fa3ff', '#fbbf24', '#c084fc', '#f87171', '#38bdf8', '#a78bfa', '#fcd34d']

const ChartTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,10,10,0.85)', border: '1px solid var(--border-light)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4, letterSpacing: '0.02em' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].payload.fill || 'var(--accent-blue)', fontSize: 16, fontFamily: 'var(--font-display)' }}>{payload[0].value}</div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div className="eyebrow" style={{ marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  )
}

export default function InsightsDashboard({ insights }) {
  const catData = Object.entries(insights.by_category || {}).map(([name, value]) => ({ name, value }))
  const senData = Object.entries(insights.by_seniority || {}).map(([name, value]) => ({ name, value }))
  const top10   = (insights.top_companies || []).slice(0, 8)
  const maxCo   = top10[0]?.[1] ?? 1

  return (
    <div className="anim-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

      {/* Category donut */}
      <SectionCard title="By Category">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={catData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                 dataKey="value" paddingAngle={4} stroke="none">
              {catData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 12 }}>
          {catData.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0, boxShadow: `0 0 8px ${PALETTE[i % PALETTE.length]}80` }} />
              <span style={{ color: 'var(--text-muted)' }}>{d.name.split('/')[0]}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{d.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Seniority horizontal bar */}
      <SectionCard title="By Seniority">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={senData} layout="vertical" barSize={10} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                   axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {senData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Top companies progress bars */}
      <SectionCard title="Top Companies">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {top10.map(([name, count], i) => (
            <div key={name} className="bar-row">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }} className="truncate">{name || 'Unknown'}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{
                  width: `${(count / maxCo) * 100}%`,
                  background: PALETTE[i % PALETTE.length],
                  boxShadow: `0 0 10px ${PALETTE[i % PALETTE.length]}80`,
                }} />
              </div>
              <div className="font-display" style={{ fontSize: 14, color: 'var(--text-main)', textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
