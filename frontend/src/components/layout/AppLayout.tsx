import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  useEffect(() => {
    const handleOpen = () => setShowTypeSelector(true);
    window.addEventListener('open-txn-type-selector', handleOpen);
    return () => window.removeEventListener('open-txn-type-selector', handleOpen);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <div className="app-content-wrapper">
        <Navbar onMenuToggle={toggleSidebar} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>

      {showTypeSelector && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255, 255, 255, 0.4)', zIndex: 1000 }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)', 
            border: '1px solid rgba(255, 255, 255, 0.3)', 
            borderRadius: '24px', 
            padding: '40px', 
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)', 
            textAlign: 'center',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <h2 style={{ marginBottom: '32px', fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, color: 'var(--color-text)' }}>Select Transaction Type</h2>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <button 
                onClick={() => { setShowTypeSelector(false); window.dispatchEvent(new CustomEvent('open-quick-txn-modal', { detail: { type: 'credit' } })); }}
                style={{ width: '160px', height: '160px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.05)', border: '2px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.15)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'; }}
              >
                <TrendingUp size={48} color="var(--color-success)" style={{ marginBottom: '16px' }} />
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success-text)' }}>Credit</span>
              </button>
              
              <button 
                onClick={() => { setShowTypeSelector(false); window.dispatchEvent(new CustomEvent('open-quick-txn-modal', { detail: { type: 'debit' } })); }}
                style={{ width: '160px', height: '160px', borderRadius: '20px', background: 'rgba(186, 26, 26, 0.05)', border: '2px solid rgba(186, 26, 26, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(186, 26, 26, 0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(186, 26, 26, 0.15)'; e.currentTarget.style.borderColor = 'rgba(186, 26, 26, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(186, 26, 26, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(186, 26, 26, 0.2)'; }}
              >
                <TrendingDown size={48} color="var(--color-danger)" style={{ marginBottom: '16px' }} />
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-danger-text)' }}>Debit</span>
              </button>
            </div>
            
            <button 
              style={{ marginTop: '32px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-container-high)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={() => setShowTypeSelector(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
