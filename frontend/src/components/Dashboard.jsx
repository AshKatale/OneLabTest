import './Dashboard.css'

const ISSUE_CONFIG = {
  missing_settlement:    { label: 'Missing Settlement',   color: '#ef4444', bg: '#fee2e2' },
  extra_settlement:      { label: 'Extra Settlement',     color: '#f59e0b', bg: '#fef3c7' },
  duplicate_settlement:  { label: 'Duplicate',            color: '#7c3aed', bg: '#ede9fe' },
  amount_mismatch:       { label: 'Amount Mismatch',      color: '#ec4899', bg: '#fce7f3' },
  cross_month_settlement:{ label: 'Cross-Month',          color: '#6366f1', bg: '#ede9fe' },
  invalid_refund:        { label: 'Invalid Refund',       color: '#f97316', bg: '#ffedd5' },
}

function StatCard({ label, value, sub, accent, bg, icon }) {
  return (
    <div className="stat-card" style={{ '--accent': accent, '--accent-bg': bg }}>
      <div className="stat-card-top">
        <div className="stat-icon-box" style={{ background: bg, color: accent }}>
          {icon}
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function Dashboard({ dataGenerated, dataStats, reconciliationResult }) {
  const s = reconciliationResult?.summary
  const matchRate = s
    ? Math.round((s.matched_transactions / Math.max(s.total_transactions, 1)) * 100)
    : null

  return (
    <div className="dashboard">
      {/* ── Stat Cards ── */}
      <div className="stats-row">
        <StatCard
          label="Transactions"
          value={s?.total_transactions ?? dataStats?.transaction_count}
          sub="March 2026"
          accent="#4361EE"
          bg="#EEF2FF"
          icon="📋"
        />
        <StatCard
          label="Settlements"
          value={s?.total_settlements ?? dataStats?.settlement_count}
          sub="Bank records"
          accent="#7c3aed"
          bg="#f3e8ff"
          icon="💳"
        />
        <StatCard
          label="Matched"
          value={s ? `${s.matched_transactions} / ${s.total_transactions}` : null}
          sub={s ? `${matchRate}% match rate` : 'Run reconciliation'}
          accent="#10b981"
          bg="#d1fae5"
          icon="✓"
        />
        <StatCard
          label="Total Issues"
          value={s?.total_issues}
          sub={s ? (s.total_issues === 0 ? 'All clear!' : 'Action required') : 'Run reconciliation'}
          accent={s?.total_issues > 0 ? '#ef4444' : '#10b981'}
          bg={s?.total_issues > 0    ? '#fee2e2' : '#d1fae5'}
          icon={s?.total_issues > 0  ? '⚠' : '✓'}
        />
      </div>

      {/* ── Second row (only after reconciliation) ── */}
      {s && (
        <div className="dash-row2">
          {/* Amount summary */}
          <div className="dash-card amount-card">
            <h3 className="dash-card-title">Amount Summary</h3>
            <div className="amount-items">
              <div className="amount-item">
                <span className="amount-item-label">Transaction Total</span>
                <span className="amount-item-value">
                  ${s.total_transaction_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="amount-sep" />
              <div className="amount-item">
                <span className="amount-item-label">Settlement Total</span>
                <span className="amount-item-value">
                  ${s.total_settlement_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="amount-sep" />
              <div className="amount-item">
                <span className="amount-item-label">Net Difference</span>
                <span className={`amount-item-value ${s.amount_difference === 0 ? 'clr-green' : 'clr-red'}`}>
                  {s.amount_difference >= 0 ? '+' : ''}
                  ${s.amount_difference.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Match-rate bar */}
            <div className="match-bar-section">
              <div className="match-bar-header">
                <span className="match-bar-label">Match Rate</span>
                <span className="match-bar-pct">{matchRate}%</span>
              </div>
              <div className="match-bar-track">
                <div
                  className="match-bar-fill"
                  style={{
                    width: `${matchRate}%`,
                    background: matchRate > 90 ? '#10b981' : matchRate > 70 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <div className="match-bar-legend">
                <span>{s.matched_transactions} matched</span>
                <span>{s.unmatched_transactions} unmatched</span>
              </div>
            </div>
          </div>

          {/* Issue breakdown */}
          {s.issue_breakdown && Object.keys(s.issue_breakdown).length > 0 && (
            <div className="dash-card breakdown-card">
              <h3 className="dash-card-title">Issue Breakdown</h3>
              <div className="breakdown-rows">
                {Object.entries(s.issue_breakdown).map(([type, count]) => {
                  const cfg = ISSUE_CONFIG[type] || { label: type, color: '#64748b', bg: '#f1f5f9' }
                  const pct = Math.round((count / s.total_issues) * 100)
                  return (
                    <div key={type} className="bdown-row">
                      <div className="bdown-meta">
                        <span className="bdown-dot" style={{ background: cfg.color }} />
                        <span className="bdown-label">{cfg.label}</span>
                        <span className="bdown-count" style={{ color: cfg.color, background: cfg.bg }}>
                          {count}
                        </span>
                      </div>
                      <div className="bdown-track">
                        <div
                          className="bdown-fill"
                          style={{ width: `${pct}%`, background: cfg.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
