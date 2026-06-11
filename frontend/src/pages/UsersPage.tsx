import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users.api';
import { walletsApi } from '../api/wallets.api';
import type { CreateUserPayload } from '../types/user.types';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { UserForm } from '../components/forms/UserForm';
import { WalletForm } from '../components/forms/WalletForm';
import { formatDate } from '../utils/format-date';
import { formatCurrency } from '../utils/currency';
import { Users, Wallet, Plus, Link, AlertTriangle, Check, UserPlus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { transactionsApi } from '../api/transactions.api';

function WalletBadge({ id, currency }: { id: string; currency: string }) {
  const navigate = useNavigate();

  return (
    <button
      className="btn btn-ghost"
      style={{
        padding: '4px 8px',
        fontSize: '11px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
      onClick={() => navigate(`/wallets/${id}`)}
      title={`Inspect wallet: ${id}`}
    >
      <Wallet size={12} className="text-credit" />
      <span style={{ fontWeight: 600 }}>{currency} Wallet</span>
      <span style={{ fontSize: '9px', opacity: 0.5 }}>({id.slice(0, 8)})</span>
    </button>
  );
}

function WalletBalanceText({ id, currency }: { id: string; currency: string }) {
  const { data: wallet } = useQuery({
    queryKey: ['wallet', id],
    queryFn: () => walletsApi.getById(id),
    staleTime: 5000,
  });

  return (
    <div style={{ padding: '4px 0', fontSize: '13px', fontFamily: 'Share Tech, monospace', fontWeight: 600, minHeight: '26px', display: 'flex', alignItems: 'center' }}>
      {wallet ? formatCurrency(Number(wallet.balance), currency) : '...'}
    </div>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();


  const [showUserModal, setShowUserModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState<string | null>(null);


  const [linkWalletId, setLinkWalletId] = useState('');
  const [linkWalletError, setLinkWalletError] = useState('');


  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState(sessionStorage.getItem('badrgo_search') || '');
  const [showTxnModal, setShowTxnModal] = useState<{ type: 'credit' | 'debit'; walletId: string; currency: string } | null>(null);
  const [txnAnimation, setTxnAnimation] = useState<'success' | 'error' | 'in-progress' | null>(null);
  const [txnAnimMsg, setTxnAnimMsg] = useState('');
  const [txnRefId, setTxnRefId] = useState('');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDesc, setTxnDesc] = useState('');

  // Local storage mapping state: userId -> Array<{ id: string, currency: string }>
  const [userWallets, setUserWallets] = useState<Record<string, { id: string; currency: string }[]>>(() => {
    try {
      const stored = localStorage.getItem('badrgo_user_wallets');
      const currentMapping = stored ? JSON.parse(stored) : {};

      const seedUserId = '67ddfc59-ca6c-4e9e-9d1e-93acf27e9c75';
      const seedWalletId = '8fdc8460-7c46-47a9-83af-e00acca9b311';


      if (!currentMapping[seedUserId]) {
        currentMapping[seedUserId] = [{ id: seedWalletId, currency: 'QAR' }];
        localStorage.setItem('badrgo_user_wallets', JSON.stringify(currentMapping));


        const recentStored = localStorage.getItem('badrgo_recent_wallets');
        const recent = recentStored ? JSON.parse(recentStored) : [];
        if (!recent.some((w: { id: string }) => w.id === seedWalletId)) {
          recent.push({ id: seedWalletId, currency: 'QAR' });
          localStorage.setItem('badrgo_recent_wallets', JSON.stringify(recent));
        }
        setTimeout(() => {
          window.dispatchEvent(new Event('recent_wallets_updated'));
        }, 0);
      }

      return currentMapping;
    } catch {
      return {};
    }
  });


  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll
  });


  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('badrgo_user_wallets');
        if (stored) {
          setUserWallets(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleOpenUser = () => {
      setSuccessMsg('');
      setErrorMsg('');
      setShowUserModal(true);
    };

    const handleSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent<string>).detail || '');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('open-create-user-modal', handleOpenUser);
    window.addEventListener('global-search', handleSearch);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('open-create-user-modal', handleOpenUser);
      window.removeEventListener('global-search', handleSearch);
    };
  }, []);

  const filteredUsers = users?.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg(`User "${newUser.name}" created successfully.`);
      setErrorMsg('');
      setShowUserModal(false);

      // Auto-open wallet creation modal for the new user!
      setTimeout(() => {
        setShowWalletModal(newUser.id);
      }, 500);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    },
  });


  const createWalletMutation = useMutation({
    mutationFn: (payload: { userId: string; currency: string }) => walletsApi.create(payload),
    onSuccess: (newWallet) => {
      // Save wallet mapping
      const userId = newWallet.userId;
      const currentMapping = { ...userWallets };
      if (!currentMapping[userId]) currentMapping[userId] = [];

      currentMapping[userId].push({ id: newWallet.id, currency: newWallet.currency });
      localStorage.setItem('badrgo_user_wallets', JSON.stringify(currentMapping));
      setUserWallets(currentMapping);


      try {
        const recentStored = localStorage.getItem('badrgo_recent_wallets');
        const recent = recentStored ? JSON.parse(recentStored) : [];
        if (!recent.some((w: { id: string }) => w.id === newWallet.id)) {
          recent.unshift({ id: newWallet.id, currency: newWallet.currency });
          localStorage.setItem('badrgo_recent_wallets', JSON.stringify(recent.slice(0, 5)));
        }
      } catch (e) {
        console.error(e);
      }

      window.dispatchEvent(new Event('recent_wallets_updated'));
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      setSuccessMsg(`Wallet created successfully: ${newWallet.id}`);
      setErrorMsg('');
      setShowWalletModal(null);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    }
  });

  const handleCreateUser = (data: CreateUserPayload) => {
    createUserMutation.mutate(data);
  };

  const handleCreateWallet = (currency: string, userId: string) => {
    createWalletMutation.mutate({ userId, currency });
  };

  const quickTxnMutation = useMutation({
    mutationFn: (payload: { walletId: string; type: 'credit' | 'debit'; amount: number; referenceId: string; description?: string }) => {
      const { walletId, type, ...body } = payload;
      return type === 'credit' ? transactionsApi.credit(walletId, body) : transactionsApi.debit(walletId, body);
    },
    onSuccess: (tx: any) => {
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      queryClient.invalidateQueries({ queryKey: ['global-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', showTxnModal?.walletId] });
      setShowTxnModal(null);
      setTxnRefId(''); setTxnAmount(''); setTxnDesc('');
      if (tx.isIdempotent) {
        setTxnAnimMsg(`payment with this referenceId already processed, Try with new payment`);
        setTxnAnimation('success');
        setTimeout(() => setTxnAnimation(null), 3000);
      } else {
        setSuccessMsg(`Transaction applied: ${tx.referenceId}`);
        setTxnAnimation('success');
        setTimeout(() => setTxnAnimation(null), 2500);
      }
    },
    onError: (err: any) => {
      const isConflict = err?.response?.status === 409;
      const isIdempotentFail = err?.response?.data?.isIdempotent === true;
      setShowTxnModal(null);
      setTxnRefId(''); setTxnAmount(''); setTxnDesc('');
      if (isConflict || isIdempotentFail) {
        setTxnAnimMsg('Payment in progress.');
        setTxnAnimation('in-progress');
        setTimeout(() => setTxnAnimation(null), 3000);
      } else {
        setTxnAnimMsg(err?.response?.data?.message || err.message || 'The operation was rejected by the system.');
        setTxnAnimation('error');
        setTimeout(() => setTxnAnimation(null), 2500);
      }
    }
  });

  const handleApplyTxn = () => {
    if (!showTxnModal) return;
    const amountCents = Math.round(parseFloat(txnAmount) * 100);
    if (!txnAmount || isNaN(amountCents) || amountCents <= 0) return;
    if (!txnRefId.trim()) return;
    quickTxnMutation.mutate({
      walletId: showTxnModal.walletId,
      type: showTxnModal.type,
      amount: amountCents,
      referenceId: txnRefId.trim(),
      description: txnDesc.trim() || undefined,
    });
  };

  const handleLinkWallet = (userId: string) => {
    setLinkWalletError('');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(linkWalletId.trim())) {
      setLinkWalletError('Invalid UUID format. Must be a standard UUID.');
      return;
    }

    // Attempt to verify the wallet exists by fetching it
    walletsApi.getById(linkWalletId.trim())
      .then((wallet) => {
        // Successful verification — associate it
        const currentMapping = { ...userWallets };
        if (!currentMapping[userId]) currentMapping[userId] = [];

        // Prevent duplicates
        if (!currentMapping[userId].some((w) => w.id === wallet.id)) {
          currentMapping[userId].push({ id: wallet.id, currency: wallet.currency });
          localStorage.setItem('badrgo_user_wallets', JSON.stringify(currentMapping));
          setUserWallets(currentMapping);
        }


        const recentStored = localStorage.getItem('badrgo_recent_wallets');
        const recent = recentStored ? JSON.parse(recentStored) : [];
        if (!recent.some((w: { id: string }) => w.id === wallet.id)) {
          recent.unshift({ id: wallet.id, currency: wallet.currency });
          localStorage.setItem('badrgo_recent_wallets', JSON.stringify(recent.slice(0, 5)));
        }
        window.dispatchEvent(new Event('recent_wallets_updated'));

        setSuccessMsg(`Wallet linked successfully.`);
        setErrorMsg('');
        setLinkWalletId('');
        setShowLinkModal(null);
      })
      .catch((err) => {
        setLinkWalletError(`Verification failed: ${err.message}. Make sure this wallet exists.`);
      });
  };

  const selectedUserName = users?.find(u => u.id === (showWalletModal || showLinkModal))?.name;

  return (
    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
      <div className="page-header flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Users Directory</h1>
          <p className="page-subtitle">Configure accounts, initialize wallets, and manage cash flows</p>
        </div>
        <Button
          variant="primary"
          icon={<UserPlus size={16} />}
          onClick={() => { setShowUserModal(true); setSuccessMsg(''); setErrorMsg(''); }}
        >
          New User
        </Button>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* User Table Card */}
      <Card>
        {isLoading ? (
          <Loader message="Fetching user details..." />
        ) : error ? (
          <div className="error-state">⚠️ {(error as Error).message}</div>
        ) : !users?.length ? (
          <EmptyState
            icon={<Users size={40} style={{ opacity: 0.4 }} />}
            title="No Users Found"
            description="Add your first customer account to configure transaction wallets."
            actionButton={
              <Button variant="primary" onClick={() => setShowUserModal(true)}>
                Add User Account
              </Button>
            }
          />
        ) : !filteredUsers?.length ? (
          <EmptyState
            icon={<Users size={40} style={{ opacity: 0.4 }} />}
            title="No Matching Users"
            description="Refine your search parameters to locate other customer indexes."
          />
        ) : (
          <Table headers={['Name', 'Email', 'Phone', 'Wallets', 'Current Balance', 'Status', 'Registered']}>
            {filteredUsers.map((user) => {
              const wallets = user.wallets || [];
              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex flex-col">
                      <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{user.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        ID: {user.id}
                      </span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>
                    <div className="flex flex-col gap-2 items-start">
                      {wallets.length === 0 ? (
                        <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                          No wallets initialized
                        </span>
                      ) : (
                        wallets.map((w) => (
                          <WalletBadge key={w.id} id={w.id} currency={w.currency} />
                        ))
                      )}

                      <div className="flex gap-2" style={{ marginTop: '4px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 6px', fontSize: '10px', borderRadius: '4px', gap: '3px', background: 'rgba(99, 102, 241, 0.05)' }}
                          onClick={() => { setShowWalletModal(user.id); setSuccessMsg(''); setErrorMsg(''); }}
                        >
                          <Plus size={10} />
                          <span>New Wallet</span>
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 6px', fontSize: '10px', borderRadius: '4px', gap: '3px', background: 'var(--color-container-high)' }}
                          onClick={() => { setShowLinkModal(user.id); setLinkWalletId(''); setLinkWalletError(''); setSuccessMsg(''); setErrorMsg(''); }}
                        >
                          <Link size={10} />
                          <span>Link UUID</span>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      {wallets.length === 0 ? (
                        <span style={{ fontSize: '11px', color: 'transparent' }}>-</span>
                      ) : (
                        wallets.map((w) => (
                          <WalletBalanceText key={`bal-${w.id}`} id={w.id} currency={w.currency} />
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="text-muted">{formatDate(user.createdAt)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      { }
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create User Account</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <UserForm
                onSubmit={handleCreateUser}
                isPending={createUserMutation.isPending}
                onCancel={() => setShowUserModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      { }
      {showWalletModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Initialize Transaction Wallet</h2>
              <button className="modal-close" onClick={() => setShowWalletModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <WalletForm
                userName={selectedUserName}
                isPending={createWalletMutation.isPending}
                onSubmit={(data) => handleCreateWallet(data.currency, showWalletModal)}
                onCancel={() => setShowWalletModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      { }
      {showLinkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Link Existing Wallet</h2>
              <button className="modal-close" onClick={() => setShowLinkModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-soft)' }}>
                Associate a pre-existing wallet UUID with <strong>{selectedUserName}</strong>.
              </div>
              <div className="form-group">
                <label className="form-label">Wallet UUID</label>
                <input
                  className="form-input"
                  placeholder="e.g. 8fdc8460-7c46-47a9-83af-e00acca9b311"
                  value={linkWalletId}
                  onChange={(e) => setLinkWalletId(e.target.value)}
                />
                {linkWalletError && <span className="form-error">{linkWalletError}</span>}
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="ghost" onClick={() => setShowLinkModal(null)} style={{ marginRight: '8px' }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => handleLinkWallet(showLinkModal)}>
                  Link Wallet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Quick Txn Modal */}
      {showTxnModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ background: showTxnModal.type === 'credit' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)' }}>
              <div className="flex items-center gap-2">
                {showTxnModal.type === 'credit' ? <TrendingUp size={18} className="text-credit" /> : <TrendingDown size={18} className="text-debit" />}
                <h2 className="modal-title">
                  {showTxnModal.type === 'credit' ? 'Credit' : 'Debit'} Wallet ({showTxnModal.currency})
                </h2>
              </div>
              <button className="modal-close" onClick={() => setShowTxnModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Amount ({showTxnModal.currency})</label>
                <input className="form-input" type="number" min="0.01" step="0.01" placeholder="e.g. 100.00"
                  value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Reference ID (Idempotency Key)</label>
                <input className="form-input" placeholder="e.g. TXN-2024-001"
                  value={txnRefId} onChange={(e) => setTxnRefId(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input className="form-input" placeholder="e.g. Monthly subscription"
                  value={txnDesc} onChange={(e) => setTxnDesc(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="ghost" onClick={() => setShowTxnModal(null)}>Cancel</Button>
                <Button
                  variant={showTxnModal.type === 'credit' ? 'primary' : 'danger'}
                  onClick={handleApplyTxn}
                  disabled={quickTxnMutation.isPending || !txnAmount || !txnRefId}
                >
                  {quickTxnMutation.isPending ? 'Processing...' : `Apply ${showTxnModal.type === 'credit' ? 'Credit' : 'Debit'}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Animations Overlay */}
      {txnAnimation && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes usersPagePopIn { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
            @keyframes usersPageShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-15px); } 40%, 80% { transform: translateX(15px); } }
            @keyframes usersPageSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes usersPagePulseOk { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); } 70% { box-shadow: 0 0 0 30px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
            @keyframes usersPagePulseErr { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 70% { box-shadow: 0 0 0 30px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
            @keyframes usersPagePulseWarn { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.6); } 70% { box-shadow: 0 0 0 30px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
          `}</style>
          <div style={{
            background: 'var(--color-surface)', padding: '48px 64px', borderRadius: '32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)', animation: 'usersPagePopIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards'
          }}>
            {txnAnimation === 'success' && (
              <div style={{
                background: 'var(--color-success)', color: 'white', borderRadius: '50%', padding: '24px',
                animation: 'usersPagePopIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) 0.1s both, usersPagePulseOk 1.5s infinite 0.6s'
              }}><Check size={72} strokeWidth={3} /></div>
            )}
            {txnAnimation === 'error' && (
              <div style={{
                background: 'var(--color-danger)', color: 'white', borderRadius: '50%', padding: '24px',
                animation: 'usersPageShake 0.6s cubic-bezier(.36,.07,.19,.97) 0.1s both, usersPagePulseErr 1.5s infinite 0.6s'
              }}><X size={72} strokeWidth={3} /></div>
            )}
            {txnAnimation === 'in-progress' && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '4px solid rgb(245,158,11)', color: 'rgb(245,158,11)', borderRadius: '50%', padding: '24px',
                animation: 'usersPageSpin 1s linear infinite, usersPagePulseWarn 1.5s infinite 0.3s'
              }}>
                <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2 A10 10 0 0 1 22 12" />
                </svg>
              </div>
            )}
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
              {txnAnimation === 'success' && (txnAnimMsg ? 'Already Processed' : 'Transaction Successful!')}
              {txnAnimation === 'error' && 'Transaction Failed'}
              {txnAnimation === 'in-progress' && 'Payment In Progress'}
            </h2>
            <p style={{ color: 'var(--color-text-soft)', fontSize: '15px', marginTop: '-8px', textAlign: 'center', maxWidth: '320px' }}>
              {txnAnimation === 'success' && (txnAnimMsg || 'The funds have been settled into the ledger.')}
              {txnAnimation === 'error' && (txnAnimMsg || 'The operation was rejected by the system.')}
              {txnAnimation === 'in-progress' && (txnAnimMsg || 'Payment already in process. Kindly wait before retrying.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
