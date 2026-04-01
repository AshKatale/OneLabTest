import { useState } from 'react'
import './ReconciliationResults.css'

const ISSUE_CONFIG = {
  missing_settlement:     { label: 'Missing Settlement',    color: '#ef4444', bg: '#fee2e2', icon: '◎' },
  extra_settlement:       { label: 'Extra Settlement',      color: '#f59e0b', bg: '#fef3c7', icon: '+' },
  duplicate_settlement:   { label: 'Duplicate Settlement',  color: '#7c3aed', bg: '#ede9fe', icon: '⧉' },
  amount_mismatch:        { label: 'Amount Mismatch',       color: '#ec4899', bg: '#fce7f3', icon: '≠' },
  cross_month_settlement: { label: 'Cross-Month',           color: '#6366f1', bg: '#ede9fe', icon: '↗' },
  invalid_refund:         { label: 'Invalid Refund',        color: '#f97316', bg: '#ffedd5', icon: '↩' },
}

function fmt(amount) {
  return typeof amount === 'number'
    ? `$${amount.toFixed(2)}`
    : '—'
}

function fmtDate(val) {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return val }
}

function IssueDetail({ issue }) {
  const type = issue.type
  return (
    <div className="issue-detail">
      {type === 'missing_settlement' && (
        <>
          <Row label="Transaction ID"  value={issue.transaction_id}  />
          <Row label="Amount"          value={fmt(issue.amount)}      highlight />
          <Row label="Transaction Date" value={fmtDate(issue.transaction_date)} />
          <Note>Transaction was recorded but never settled by the bank in the target month.</Note>
        </>
      )}
      {type === 'extra_settlement' && (
        <>
          <Row label="Settlement ID"  value={issue.settlement_id}      />
          <Row label="Transaction ID" value={issue.transaction_id}     />
          <Row label="Amount"         value={fmt(issue.amount)}        highlight />
          <Row label="Settled Date"   value={fmtDate(issue.settled_date)} />
          <Note>A settlement arrived with no matching transaction in our records.</Note>
        </>
      )}
      {type === 'duplicate_settlement' && (
        <>
          <Row label="Transaction ID" value={issue.transaction_id} />
          <Row label="Amount"         value={fmt(issue.amount)}    highlight />
          <Row label="Count"          value={`${issue.count} settlements`} />
          <div className="detail-row">
            <span className="detail-label">Settlement IDs</span>
            <div className="id-badge-list">
              {issue.settlement_ids?.map(id => (
                <span key={id} className="id-badge">{id}</span>
              ))}
            </div>
          </div>
          <Note>The same transaction was settled more than once by the bank.</Note>
        </>
      )}
      {type === 'amount_mismatch' && (
        <>
          <Row label="Transaction ID"     value={issue.transaction_id}           />
          <Row label="Settlement ID"      value={issue.settlement_id}            />
          <Row label="Transaction Amount" value={fmt(issue.transaction_amount)}  />
          <Row label="Settlement Amount"  value={fmt(issue.settlement_amount)}   />
          <Row label="Difference"         value={fmt(issue.difference)}          highlight />
          <Note>Amounts differ beyond the allowed tolerance (±$0.01).</Note>
        </>
      )}
      {type === 'cross_month_settlement' && (
        <>
          <Row label="Transaction ID"    value={issue.transaction_id}            />
          <Row label="Settlement ID"     value={issue.settlement_id}             />
          <Row label="Amount"            value={fmt(issue.amount)}               />
          <Row label="Transaction Month" value={issue.transaction_month}         />
          <Row label="Settlement Month"  value={issue.settlement_month}          highlight />
          <Row label="Settlement Date"   value={fmtDate(issue.settlement_date)}  />
          <Note>Transaction was in the target month but was settled in a different month.</Note>
        </>
      )}
      {type === 'invalid_refund' && (
        <>
          <Row label="Refund ID" value={issue.transaction_id} />
          <Row label="Amount"    value={fmt(issue.amount)}    highlight />
          <Row label="Date"      value={fmtDate(issue.timestamp)} />
          <Row label="Reason"    value={issue.reason}         />
          <Note>A refund was recorded without a corresponding original payment transaction.</Note>
        </>
      )}
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className={`detail-row ${highlight ? 'highlight' : ''}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function Note({ children }) {
  return <div className="issue-note">ℹ {children}</div>
}

function ReconciliationResults({ data }) {
  const [filter, setFilter]   = useState('all')
  const [expanded, setExpanded] = useState({})

  const grouped = data.issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || []
    acc[issue.type].push(issue)
    return acc
  }, {})

  const visible = filter === 'all'
    ? data.issues
    : data.issues.filter(i => i.type === filter)

  const toggle = idx =>
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))

  return (
    <div className="rr-wrapper">
      <div className="rr-header">
        <h3 className="rr-title">🔍 Detected Issues</h3>
        <span className="rr-meta">
          {new Date(data.reconciliation_date).toLocaleString()} · {data.target_month}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        <button
          className={`ftab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All <span className="ftab-count">{data.issues.length}</span>
        </button>
        {Object.entries(grouped).map(([type, issues]) => {
          const cfg = ISSUE_CONFIG[type] || {}
          return (
            <button
              key={type}
              className={`ftab ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
              style={filter === type ? { '--ftab-color': cfg.color, '--ftab-bg': cfg.bg } : {}}
            >
              {cfg.label || type}{' '}
              <span className="ftab-count" style={{ background: cfg.bg, color: cfg.color }}>
                {issues.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Issues list */}
      <div className="issues-list">
        {visible.length === 0 ? (
          <div className="no-issues">
            <span className="no-issues-icon">✓</span>
            <p>No issues for this filter.</p>
          </div>
        ) : (
          visible.map((issue, idx) => {
            const cfg = ISSUE_CONFIG[issue.type] || { label: issue.type, color: '#64748b', bg: '#f1f5f9', icon: '!' }
            const isOpen = !!expanded[idx]
            return (
              <div key={idx} className={`issue-card ${isOpen ? 'open' : ''}`}>
                <button className="issue-card-header" onClick={() => toggle(idx)}>
                  <span
                    className="issue-type-pill"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.icon} {cfg.label}
                  </span>

                  <span className="issue-txn-id">{issue.transaction_id}</span>

                  {issue.amount !== undefined && (
                    <span className="issue-amount">{fmt(issue.amount)}</span>
                  )}

                  <span className={`expand-icon ${isOpen ? 'rotated' : ''}`}>›</span>
                </button>

                {isOpen && <IssueDetail issue={issue} />}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ReconciliationResults
