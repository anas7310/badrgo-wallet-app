import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { walletsApi } from '../../api/wallets.api';
import { LayoutDashboard, Users, BarChart3, Wallet, Link, Landmark, User, HelpCircle, Plus } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/users', label: 'Users', icon: <Users size={16} /> },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={16} /> },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: allWallets } = useQuery({
    queryKey: ['all-wallets'],
    queryFn: walletsApi.getAll,
  });

  const recentWallets = allWallets ? allWallets.slice(0, 5) : [];
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkId, setLinkId] = useState('');
  const [linkError, setLinkError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const handleLinkWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(linkId.trim())) {
      setLinkError('Invalid UUID format');
      return;
    }

    // local mapping fallback removed
    setLinkId('');
    setShowLinkInput(false);
    onClose?.();
    navigate(`/wallets/${linkId.trim()}`);
  };

  const triggerQuickTxn = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-txn-type-selector'));
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('open-txn-type-selector'));
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      {}
      <div className="sidebar-brand">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center', width: '100%' }}>
          <img 
            src="/badrgo_logo.svg" 
            alt="Badrgo Logo" 
            style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
          />
          <div className="sidebar-title-wrapper">
            <span className="sidebar-title">Badrgo Wallet Manager</span>
          </div>
        </div>
        <button 
          className="sidebar-close-btn" 
          onClick={onClose}
          title="Close Menu"
        >
          ×
        </button>
      </div>

      {}
      <nav className="sidebar-nav">
        <span className="sidebar-section-title">Navigation</span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
            onClick={() => onClose?.()}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-separator" />

        {}
        <div className="flex justify-between items-center" style={{ padding: '8px 12px' }}>
          <span className="sidebar-section-title" style={{ margin: 0, padding: 0 }}>Recent Wallets</span>
          <button 
            className="sidebar-action-btn"
            onClick={() => {
              setShowLinkInput(!showLinkInput);
              setLinkError('');
            }}
            title="Link wallet by ID"
          >
            <Link size={12} />
          </button>
        </div>

        {showLinkInput && (
          <form onSubmit={handleLinkWalletSubmit} style={{ padding: '4px 12px 12px 12px' }}>
            <input
              type="text"
              className="form-input"
              style={{ padding: '6px 8px', fontSize: '11px', background: 'var(--color-container-low)', border: '1px solid var(--color-border)' }}
              placeholder="Paste Wallet UUID..."
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              autoFocus
            />
            {linkError && <span className="form-error" style={{ fontSize: '10px' }}>{linkError}</span>}
          </form>
        )}

        <div className="sidebar-recent-list">
          {recentWallets.length === 0 ? (
            <span className="sidebar-empty-text">No wallets linked yet</span>
          ) : (
            recentWallets.map((wallet) => {
              const isActive = location.pathname === `/wallets/${wallet.id}`;
              return (
                <NavLink
                  key={wallet.id}
                  to={`/wallets/${wallet.id}`}
                  className={`sidebar-recent-link ${isActive ? 'sidebar-recent-link--active' : ''}`}
                  title={wallet.id}
                  onClick={() => onClose?.()}
                >
                  <Wallet size={12} style={{ opacity: 0.6 }} />
                  <span className="font-mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    {wallet.id.slice(0, 8)}... ({wallet.currency || 'USD'})
                  </span>
                </NavLink>
              );
            })
          )}
        </div>
      </nav>

      {}
      <div className="sidebar-footer">
        <button 
          className="btn btn-primary w-full"
          style={{ padding: '8px', marginBottom: '8px', fontSize: '12px' }}
          onClick={() => {
            triggerQuickTxn();
            onClose?.();
          }}
        >
          <Plus size={14} />
          <span>New Transaction</span>
        </button>

        <a href="#" className="sidebar-footer-link" onClick={(e) => { e.preventDefault(); onClose?.(); setShowProfile(true); }}>
          <User size={14} />
          <span>Profile</span>
        </a>
        <a href="#" className="sidebar-footer-link" onClick={(e) => { e.preventDefault(); onClose?.(); setShowSupport(true); }}>
          <HelpCircle size={14} />
          <span>Support</span>
        </a>
      </div>

      {}
      {showProfile && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Admin Profile</h2>
              <button className="modal-close" onClick={() => setShowProfile(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-primary)', fontSize: '24px', fontWeight: 700 }}>
                  A
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Anas Khan</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-soft)' }}>Super Administrator</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--color-container-low)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-soft)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Email Address</p>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>admin@badrgo.com</p>
                </div>
                <div style={{ padding: '12px', background: 'var(--color-container-low)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-soft)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Role Permissions</p>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>Full Read/Write Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {showSupport && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Support & Help</h2>
              <button className="modal-close" onClick={() => setShowSupport(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'var(--color-container-low)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <HelpCircle size={20} style={{ color: 'var(--color-primary)', marginTop: '2px' }} />
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700 }}>Contact Engineering</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-soft)' }}>For API or database related queries, email dev@badrgo.com</p>
                  </div>
                </div>
                <div style={{ padding: '16px', background: 'var(--color-container-low)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <BarChart3 size={20} style={{ color: 'var(--color-success)', marginTop: '2px' }} />
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700 }}>System Status</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-soft)' }}>All systems operational. Wallet DB latency: ~12ms</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
