import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { walletsApi } from '../../api/wallets.api';
import { Search, Bell, History, Wifi, WifiOff, Menu } from 'lucide-react';

interface NavbarProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Navbar({ title = 'Operations Portal', onMenuToggle }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState(sessionStorage.getItem('badrgo_search') || '');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  // Query to check connection health with a short retry and refetch interval
  const { isError } = useQuery({
    queryKey: ['api-health'],
    queryFn: () => walletsApi.getStats(),
    refetchInterval: 30000,
    retry: false,
  });

  const isOnline = !isError;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    sessionStorage.setItem('badrgo_search', value);
    window.dispatchEvent(new CustomEvent('global-search', { detail: value }));
  };

  const triggerCreateUser = () => {
    window.dispatchEvent(new Event('open-create-user-modal'));
  };

  const triggerQuickTxn = () => {
    window.dispatchEvent(new CustomEvent('open-txn-type-selector'));
  };

  return (
    <header className="app-header">
      {}
      <div className="flex items-center gap-4">
        <button 
          className="sidebar-toggle-btn"
          onClick={onMenuToggle}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <h2 style={{
          fontFamily: 'Geist, sans-serif',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-text)',
          letterSpacing: '-0.01em'
        }}>
          {title}
        </h2>
        
        {}
        <div className="navbar-search">
          <Search size={16} style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-soft)',
            pointerEvents: 'none'
          }} />
          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: '38px',
              paddingRight: '14px',
              paddingTop: '6px',
              paddingBottom: '6px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-container-low)',
              fontSize: '12px',
              border: '1px solid var(--color-border)',
              width: '100%',
              outline: 'none'
            }}
            placeholder="Search transactions, users, wallets..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {}
      <div className="flex items-center gap-4">
        {}
        <div className="flex items-center gap-2" style={{
          background: isOnline ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(186, 26, 26, 0.15)'}`,
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          fontSize: '11px',
          fontWeight: 600,
          color: isOnline ? 'var(--color-success-text)' : 'var(--color-danger-text)',
        }}>
          {isOnline ? (
            <>
              <Wifi size={12} />
              <span>API: Online</span>
            </>
          ) : (
            <>
              <WifiOff size={12} />
              <span>API: Offline</span>
            </>
          )}
        </div>

        {}
        <div className="flex items-center" style={{ gap: '24px', borderRight: '1px solid var(--color-border)', paddingRight: '16px', color: 'var(--color-text-soft)' }}>
          <div style={{ position: 'relative' }}>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', position: 'relative' }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={18} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                background: 'var(--color-danger)',
                borderRadius: '50%'
              }} />
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '28px',
                right: '-8px',
                width: '240px',
                background: 'var(--color-container)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px',
                zIndex: 100,
                textAlign: 'left'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>Notifications</h4>
                <div style={{ fontSize: '11px', color: 'var(--color-text)', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <strong>System Update:</strong> Ledger v1.0.4 deployed successfully.
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-soft)', padding: '8px 0' }}>
                  End-of-day reconciliation completed at 00:00 UTC.
                </div>
              </div>
            )}
          </div>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }} 
            title="Audit Logs"
            onClick={() => navigate('/reports')}
          >
            <History size={18} />
          </button>
        </div>

        {}
        <div className="navbar-actions">
          <button 
            className="btn btn-ghost" 
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={triggerCreateUser}
          >
            Create User
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={triggerQuickTxn}
          >
            New Transaction
          </button>
          
          {}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            marginLeft: '4px'
          }}>
            <img 
              alt="User Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXwLu9DjUBALNGmroeJfa_L9RkY4SbOdzzkyye-URhOOKH0elMNuUaYcD91rACiMG3Vs1S5fL0g8PYPFGP89VJckr_RudzbC62Z95ISFWH7GXbLxnxTeZqY0HEAEALvJacweQ0gMrV5WmL1wfcHWHx-eKzZ1RADjpwAkCFGHGUvjr8o9aPozHWI7C2CwjBZvWLyGXKef1pCINaPFyX8NKBO0PkhFcdys-N-axsz9jGwnN0-d9gn4xI02QSDpzFRAN5ZymfNQdpiQ"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
