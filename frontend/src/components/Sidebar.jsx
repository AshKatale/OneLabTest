import './Sidebar.css'

const NAV_ITEMS = [
  { id: 'dashboard',    icon: '⊞', label: 'Dashboard'   },
  { id: 'transactions', icon: '📋', label: 'Transactions' },
  { id: 'settlements',  icon: '💳', label: 'Settlements'  },
  { id: 'issues',       icon: '⚠',  label: 'Issues'       },
  { id: 'analytics',   icon: '📈', label: 'Analytics'    },
]

const BOTTOM_ITEMS = [
  { id: 'help',     icon: '❓', label: 'Help'     },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

function Sidebar({ activeNav, onNavChange }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🔄</div>
        <span className="logo-text">ReconSys</span>
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <p className="nav-section-label">MAIN MENU</p>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => onNavChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {activeNav === item.id && <span className="nav-active-bar" />}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <p className="nav-section-label" style={{ paddingLeft: '0.75rem' }}>SUPPORT</p>
        {BOTTOM_ITEMS.map(item => (
          <button key={item.id} className="nav-item" onClick={() => {}}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        {/* User chip */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">RS</div>
          <div>
            <p className="sidebar-user-name">ReconSys</p>
            <p className="sidebar-user-role">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
