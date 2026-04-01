import { useState } from 'react'
import axios from 'axios'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ReconciliationResults from './components/ReconciliationResults'
import './App.css'

const API = 'http://localhost:8000'

/* ──────────────────────────────────────────────────────
   Helper: generic data table
────────────────────────────────────────────────────── */
function DataTable({ columns, rows, emptyText = 'No data yet.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="page-empty">
        <div className="empty-icon-ring" style={{ margin: '0 auto 1rem' }}>📭</div>
        <p>{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Page: Transactions
────────────────────────────────────────────────────── */
function TransactionsPage({ transactions }) {
  const cols = [
    { key: 'transaction_id', label: 'Transaction ID',
      render: v => <code className="mono-id">{v}</code> },
    { key: 'type',   label: 'Type',
      render: v => <span className={`type-badge ${v}`}>{v}</span> },
    { key: 'amount', label: 'Amount',
      render: v => <strong>${Number(v).toFixed(2)}</strong> },
    { key: 'timestamp', label: 'Date',
      render: v => v ? new Date(v).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—' },
    { key: 'status', label: 'Status',
      render: v => <span className="status-pill status-completed">{v}</span> },
  ]
  return (
    <div className="page-view">
      <div className="page-view-header">
        <div>
          <h2 className="page-view-title">Transactions</h2>
          <p className="page-view-sub">{transactions.length} records · March 2026</p>
        </div>
      </div>
      <div className="page-card">
        <DataTable columns={cols} rows={transactions} emptyText="Generate data first to see transactions." />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Page: Settlements
────────────────────────────────────────────────────── */
function SettlementsPage({ settlements }) {
  const cols = [
    { key: 'settlement_id',  label: 'Settlement ID',
      render: v => <code className="mono-id">{v}</code> },
    { key: 'transaction_id', label: 'Transaction ID',
      render: v => <code className="mono-id" style={{fontSize:'0.7rem'}}>{v}</code> },
    { key: 'amount', label: 'Amount',
      render: v => <strong>${Number(v).toFixed(2)}</strong> },
    { key: 'settled_date', label: 'Settled Date',
      render: v => v ? new Date(v).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—' },
    { key: 'status', label: 'Status',
      render: v => <span className="status-pill status-settled">{v}</span> },
  ]
  return (
    <div className="page-view">
      <div className="page-view-header">
        <div>
          <h2 className="page-view-title">Settlements</h2>
          <p className="page-view-sub">{settlements.length} records from bank</p>
        </div>
      </div>
      <div className="page-card">
        <DataTable columns={cols} rows={settlements} emptyText="Generate data first to see settlements." />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Page: Issues  (requires reconciliation result)
────────────────────────────────────────────────────── */
const ISSUE_CFG = {
  missing_settlement:     { label: 'Missing Settlement',   color: '#ef4444', bg: '#fee2e2' },
  extra_settlement:       { label: 'Extra Settlement',     color: '#f59e0b', bg: '#fef3c7' },
  duplicate_settlement:   { label: 'Duplicate',            color: '#7c3aed', bg: '#ede9fe' },
  amount_mismatch:        { label: 'Amount Mismatch',      color: '#ec4899', bg: '#fce7f3' },
  cross_month_settlement: { label: 'Cross-Month',          color: '#6366f1', bg: '#ede9fe' },
  invalid_refund:         { label: 'Invalid Refund',       color: '#f97316', bg: '#ffedd5' },
}

function IssuesPage({ reconciliationResult }) {
  if (!reconciliationResult) {
    return (
      <div className="page-view">
        <div className="page-view-header">
          <h2 className="page-view-title">Issues</h2>
        </div>
        <div className="page-card">
          <div className="page-empty">
            <div className="empty-icon-ring" style={{ margin: '0 auto 1rem' }}>⚠️</div>
            <p>Run reconciliation from the Dashboard to see detected issues.</p>
          </div>
        </div>
      </div>
    )
  }

  const issues = reconciliationResult.issues || []
  const cols = [
    { key: 'type', label: 'Issue Type',
      render: v => {
        const cfg = ISSUE_CFG[v] || { label: v, color: '#64748b', bg: '#f1f5f9' }
        return <span className="type-pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      }
    },
    { key: 'transaction_id', label: 'Transaction ID',
      render: v => <code className="mono-id">{v}</code> },
    { key: 'amount', label: 'Amount',
      render: (v, row) => {
        const amt = v ?? row.transaction_amount
        return amt !== undefined ? <strong>${Number(amt).toFixed(2)}</strong> : '—'
      }
    },
    { key: 'difference', label: 'Difference',
      render: v => v !== undefined ? <span className="diff-val">${Number(v).toFixed(4)}</span> : '—' },
  ]

  return (
    <div className="page-view">
      <div className="page-view-header">
        <div>
          <h2 className="page-view-title">Issues</h2>
          <p className="page-view-sub">{issues.length} issue{issues.length !== 1 ? 's' : ''} detected · {reconciliationResult.target_month}</p>
        </div>
      </div>
      <div className="page-card">
        <DataTable columns={cols} rows={issues} emptyText="No issues detected — everything matched!" />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Page: Analytics
────────────────────────────────────────────────────── */
function AnalyticsPage({ dataStats, reconciliationResult }) {
  const s = reconciliationResult?.summary
  const matchRate = s
    ? Math.round((s.matched_transactions / Math.max(s.total_transactions, 1)) * 100)
    : null

  return (
    <div className="page-view">
      <div className="page-view-header">
        <h2 className="page-view-title">Analytics</h2>
        <p className="page-view-sub" style={{ marginTop: 2 }}>March 2026 reconciliation overview</p>
      </div>

      {!s ? (
        <div className="page-card">
          <div className="page-empty">
            <div className="empty-icon-ring" style={{ margin: '0 auto 1rem' }}>📈</div>
            <p>Generate data and run reconciliation to see analytics.</p>
          </div>
        </div>
      ) : (
        <div className="analytics-grid">
          {/* KPI cards */}
          {[
            { label: 'Match Rate',        value: `${matchRate}%`,    color: matchRate > 90 ? '#10b981' : '#f59e0b', bg: matchRate > 90 ? '#d1fae5' : '#fef3c7' },
            { label: 'Total Transactions',value: s.total_transactions,   color: '#4361EE', bg: '#EEF2FF' },
            { label: 'Total Settlements', value: s.total_settlements,    color: '#7c3aed', bg: '#f3e8ff' },
            { label: 'Total Issues',      value: s.total_issues,         color: s.total_issues > 0 ? '#ef4444' : '#10b981', bg: s.total_issues > 0 ? '#fee2e2' : '#d1fae5' },
            { label: 'Amount Difference', value: `$${s.amount_difference.toFixed(2)}`, color: s.amount_difference === 0 ? '#10b981' : '#ef4444', bg: s.amount_difference === 0 ? '#d1fae5' : '#fee2e2' },
            { label: 'Duplicates Found',  value: s.duplicate_count,     color: '#7c3aed', bg: '#ede9fe' },
          ].map(kpi => (
            <div key={kpi.label} className="analytics-kpi" style={{ '--kpi-color': kpi.color, '--kpi-bg': kpi.bg }}>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}

          {/* Issue breakdown table */}
          {Object.keys(s.issue_breakdown).length > 0 && (
            <div className="analytics-breakdown">
              <h3 className="page-card-title">Issue Breakdown</h3>
              {Object.entries(s.issue_breakdown).map(([type, count]) => {
                const cfg = ISSUE_CFG[type] || { label: type, color: '#64748b', bg: '#f1f5f9' }
                const pct = Math.round((count / s.total_issues) * 100)
                return (
                  <div key={type} className="analytics-row">
                    <span className="type-pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                    <span className="analytics-count">{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Amounts card */}
          <div className="analytics-amounts">
            <h3 className="page-card-title">Amount Summary</h3>
            <div className="amounts-list">
              <div className="amounts-row">
                <span>Transaction Total</span>
                <strong>${s.total_transaction_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="amounts-row">
                <span>Settlement Total</span>
                <strong>${s.total_settlement_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="amounts-row highlight">
                <span>Net Difference</span>
                <strong className={s.amount_difference === 0 ? 'clr-green' : 'clr-red'}>
                  {s.amount_difference >= 0 ? '+' : ''}${s.amount_difference.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Root App
────────────────────────────────────────────────────── */
function App() {
  const [loading, setLoading]             = useState(false)
  const [reconciling, setReconciling]     = useState(false)
  const [error, setError]                 = useState(null)
  const [dataGenerated, setDataGenerated] = useState(false)
  const [dataStats, setDataStats]         = useState(null)
  const [transactions, setTransactions]   = useState([])
  const [settlements, setSettlements]     = useState([])
  const [reconciliationResult, setResult] = useState(null)
  const [activeNav, setActiveNav]         = useState('dashboard')

  /* Generate */
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post(`${API}/generate-data`, { transaction_count: 50 })
      if (data.status === 'success') {
        setDataGenerated(true)
        setDataStats(data.data)
        setResult(null)
        // Fetch full lists
        const [txRes, stlRes] = await Promise.all([
          axios.get(`${API}/transactions`),
          axios.get(`${API}/settlements`),
        ])
        setTransactions(txRes.data.data || [])
        setSettlements(stlRes.data.data || [])
      } else {
        setError(data.message)
      }
    } catch (e) {
      setError(`Failed to generate data: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  /* Reconcile */
  const handleReconcile = async () => {
    if (!dataGenerated) { setError('Please generate data first.'); return }
    setReconciling(true)
    setError(null)
    try {
      const { data } = await axios.post(`${API}/reconcile`, { target_month: '2026-03' })
      if (data.status === 'success') {
        setResult(data.data)
      } else {
        setError(data.message)
      }
    } catch (e) {
      setError(`Failed to run reconciliation: ${e.message}`)
    } finally {
      setReconciling(false)
    }
  }

  /* Reset */
  const handleReset = () => {
    setDataGenerated(false)
    setDataStats(null)
    setTransactions([])
    setSettlements([])
    setResult(null)
    setError(null)
  }

  const busy = loading || reconciling

  /* Render page by activeNav */
  const renderPage = () => {
    switch (activeNav) {
      case 'transactions':
        return <TransactionsPage transactions={transactions} />
      case 'settlements':
        return <SettlementsPage settlements={settlements} />
      case 'issues':
        return <IssuesPage reconciliationResult={reconciliationResult} />
      case 'analytics':
        return <AnalyticsPage dataStats={dataStats} reconciliationResult={reconciliationResult} />
      default: // dashboard
        return (
          <>
            <Dashboard
              dataGenerated={dataGenerated}
              dataStats={dataStats}
              reconciliationResult={reconciliationResult}
            />
            {reconciliationResult && <ReconciliationResults data={reconciliationResult} />}
            {!dataGenerated && !reconciliationResult && (
              <div className="empty-state-card">
                <div className="empty-icon-ring">📊</div>
                <h2>Welcome to ReconSys</h2>
                <p>
                  Generate synthetic transaction &amp; settlement data, then run reconciliation
                  to automatically detect mismatches, duplicates, and cross-month issues.
                </p>
                <div className="edge-cases-list">
                  <div className="edge-case"><span className="badge badge-purple">Cross-Month</span> Settlement in next month</div>
                  <div className="edge-case"><span className="badge badge-blue">Duplicate</span> Same txn settled twice</div>
                  <div className="edge-case"><span className="badge badge-yellow">Rounding ±0.01</span> Amount mismatch</div>
                  <div className="edge-case"><span className="badge badge-red">Invalid Refund</span> No original transaction</div>
                </div>
              </div>
            )}
          </>
        )
    }
  }

  return (
    <div className="app-layout">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">Reconciliation Dashboard</h1>
            <p className="page-subtitle">March 2026 · Transactions vs Bank Settlements</p>
          </div>
          <div className="topbar-right">
            <button className="btn btn-outline" onClick={handleGenerate} disabled={busy}>
              {loading ? <><span className="spinner" />Generating…</> : <>📊 Generate Data</>}
            </button>
            <button className="btn btn-primary" onClick={handleReconcile} disabled={!dataGenerated || busy}>
              {reconciling ? <><span className="spinner" />Running…</> : <>🔍 Reconcile</>}
            </button>
            {dataGenerated && (
              <button className="btn btn-ghost" onClick={handleReset} disabled={busy}>↺ Reset</button>
            )}
            <div className="user-avatar" title="Admin">RS</div>
          </div>
        </header>

        {/* Content */}
        <div className="content-area">
          {error && (
            <div className="alert alert-error">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}
          {renderPage()}
        </div>
      </div>
    </div>
  )
}

export default App
