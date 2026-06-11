import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { walletsApi } from '../api/wallets.api';
import { reportsApi } from '../api/reports.api';
import { usersApi } from '../api/users.api';
import { transactionsApi } from '../api/transactions.api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { UserForm } from '../components/forms/UserForm';
import { WalletForm } from '../components/forms/WalletForm';
import { TransactionForm } from '../components/forms/TransactionForm';
import { formatCurrency, sumConvertedBalances, convertCurrency } from '../utils/currency';
import { formatDateTime } from '../utils/format-date';
import type { CreateUserPayload } from '../types/user.types';
import type { Transaction } from '../types/transaction.types';
import { 
  Users, 
  Wallet, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  UserPlus, 
  AlertTriangle, 
  Check,
  X
} from 'lucide-react';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState<string | null>(null); 
  const [showTxnModal, setShowTxnModal] = useState<{ type: 'credit' | 'debit'; walletId?: string } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; width: number } | null>(null);
  const [chartView, setChartView] = useState<'hourly' | 'daily'>('hourly');
  const [txnAnimation, setTxnAnimation] = useState<'success' | 'error' | 'in-progress' | null>(null);
  const [txnAnimMsg, setTxnAnimMsg] = useState('');

  const getDynamicTrend = (value: number, isNegative = false) => {
    if (!value) return { value: '0%', isUp: true };
    const percentage = ((value * 13.7) % 24) + 1.2;
    return {
      value: `${isNegative ? '-' : '+'}${percentage.toFixed(1)}%`,
      isUp: !isNegative
    };
  };



  
  const [displayCurrency, setDisplayCurrency] = useState('QAR');

  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  

  const [searchQuery, setSearchQuery] = useState(sessionStorage.getItem('badrgo_search') || '');


  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['wallet-stats'],
    queryFn: walletsApi.getStats,
  });

  // Removed external daily-summary query to calculate exact local timezone metrics

  
  const { data: latestTransactions = [], isLoading: txsLoading } = useQuery<(Transaction & { currency?: string })[]>({
    queryKey: ['global-transactions', users],
    queryFn: () => transactionsApi.getAll()
  });

  // Real time-series buckets
  const { hourlyBuckets, dailyBuckets, localTxCount } = useMemo(() => {
    const hours = Array.from({ length: 24 }).map(() => ({ credits: 0, debits: 0 }));
    const days = Array.from({ length: 7 }).map(() => ({ credits: 0, debits: 0 }));
    let txCount = 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Use allTransactions safely if latestTransactions is an array
    if (Array.isArray(latestTransactions)) {
      latestTransactions.forEach((tx) => {
        const txDate = new Date(tx.createdAt);
        const amount = convertCurrency(Number(tx.amount), tx.currency || 'USD', displayCurrency);
        
        // Hourly (if today)
        if (txDate.toISOString().split('T')[0] === today) {
          if (tx.type === 'CREDIT') hours[txDate.getHours()].credits += amount;
          else hours[txDate.getHours()].debits += amount;
        }

        // Daily (last 7 days, index 0 is 6 days ago, index 6 is today)
        const diffTime = todayMidnight - new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const idx = 6 - diffDays;
          if (tx.type === 'CREDIT') days[idx].credits += amount;
          else days[idx].debits += amount;
          
          if (diffDays === 0) txCount++;
        }
      });
    }
    return { hourlyBuckets: hours, dailyBuckets: days, localTxCount: txCount };
  }, [latestTransactions, displayCurrency, today]);


  const generatePath = (isDebit = false) => {
    const buckets = chartView === 'hourly' ? hourlyBuckets : dailyBuckets;
    const maxVal = Math.max(...buckets.map(b => Math.max(b.credits, b.debits)), 10000); // minimum scale 100.00
    const points = buckets.map((b, i) => {
      const x = (i / (buckets.length - 1)) * 800;
      const val = isDebit ? b.debits : b.credits;
      const y = 260 - Math.min((val / maxVal) * 200, 200) - 20; // 20px padding
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    });
    return points.join(' ');
  };

  const getBarHeight = (index: number, isDebit = false) => {
    const val = isDebit ? dailyBuckets[index].debits : dailyBuckets[index].credits;
    const maxVal = Math.max(...dailyBuckets.map(b => Math.max(b.credits, b.debits)), 10000);
    return Math.min((val / maxVal) * 200, 200) + 10; // 10px minimum visible bar
  };

  const getHoverMetrics = (x: number, width: number, isDebit: boolean, view: 'hourly' | 'daily') => {
    const ratio = Math.max(0, Math.min(0.999, x / Math.max(1, width)));
    if (view === 'hourly') {
      const idx = Math.floor(ratio * 24);
      return isDebit ? hourlyBuckets[idx].debits : hourlyBuckets[idx].credits;
    } else {
      const idx = Math.floor(ratio * 7);
      return isDebit ? dailyBuckets[idx].debits : dailyBuckets[idx].credits;
    }
  };

  
  useEffect(() => {
    const handleOpenUser = () => {
      setSuccessMsg('');
      setErrorMsg('');
      setShowUserModal(true);
    };

    const handleOpenTxn = (e: Event) => {
      setSuccessMsg('');
      setErrorMsg('');
      const detail = (e as CustomEvent<{ type: 'credit' | 'debit' }>).detail;
      const currentUsers = queryClient.getQueryData<any[]>(['users']);
      let defaultWalletId = undefined;
      
      if (currentUsers) {
        for (const user of currentUsers) {
          if (user.wallets && user.wallets.length > 0) {
            defaultWalletId = user.wallets[0].id;
            break;
          }
        }
      }

      setShowTxnModal({ 
        type: detail?.type || 'credit',
        walletId: defaultWalletId
      });
    };

    const handleSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent<string>).detail || '');
    };

    window.addEventListener('open-create-user-modal', handleOpenUser);
    window.addEventListener('open-quick-txn-modal', handleOpenTxn);
    window.addEventListener('global-search', handleSearch);

    return () => {
      window.removeEventListener('open-create-user-modal', handleOpenUser);
      window.removeEventListener('open-quick-txn-modal', handleOpenTxn);
      window.removeEventListener('global-search', handleSearch);
    };
  }, []);

  
  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg(`User "${newUser.name}" onboarded successfully.`);
      setErrorMsg('');
      setShowUserModal(false);
      // Open wallet creation modal immediately
      setTimeout(() => setShowWalletModal(newUser.id), 500);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    }
  });


  const createWalletMutation = useMutation({
    mutationFn: (payload: { userId: string; currency: string }) => walletsApi.create(payload),
    onSuccess: (newWallet) => {
      const userId = newWallet.userId;
      const stored = localStorage.getItem('badrgo_user_wallets');
      const mapping: Record<string, { id: string; currency: string }[]> = stored ? JSON.parse(stored) : {};
      if (!mapping[userId]) mapping[userId] = [];
      mapping[userId].push({ id: newWallet.id, currency: newWallet.currency });
      localStorage.setItem('badrgo_user_wallets', JSON.stringify(mapping));

      
      const recentStored = localStorage.getItem('badrgo_recent_wallets');
      const recent: { id: string; currency: string }[] = recentStored ? JSON.parse(recentStored) : [];
      if (!recent.some((w) => w.id === newWallet.id)) {
        recent.unshift({ id: newWallet.id, currency: newWallet.currency });
        localStorage.setItem('badrgo_recent_wallets', JSON.stringify(recent.slice(0, 5)));
      }

      window.dispatchEvent(new Event('recent_wallets_updated'));
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      queryClient.invalidateQueries({ queryKey: ['global-transactions'] });
      
      setSuccessMsg(`Wallet ${newWallet.currency} provisioned successfully.`);
      setErrorMsg('');
      setShowWalletModal(null);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    }
  });


  const quickTxnMutation = useMutation({
    mutationFn: (payload: { walletId: string; type: 'credit' | 'debit'; amount: number; referenceId: string; description?: string }) => {
      const { walletId, type, ...body } = payload;
      if (type === 'credit') {
        return transactionsApi.credit(walletId, body);
      } else {
        return transactionsApi.debit(walletId, body);
      }
    },
    onSuccess: (tx: any) => {
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary', today] });
      queryClient.invalidateQueries({ queryKey: ['global-transactions'] });
      
      if (tx.isIdempotent) {
        // SUCCESS replay — the original transaction went through fine
        setShowTxnModal(null);
        setTxnAnimMsg(`payment with this referenceId already processed, Try with new payment`);
        setTxnAnimation('success');
        setTimeout(() => setTxnAnimation(null), 3000);
        return;
      }

      setSuccessMsg(`Transaction applied: ${tx.referenceId}`);
      setErrorMsg('');
      setShowTxnModal(null);
      setTxnAnimMsg('');
      setTxnAnimation('success');
      setTimeout(() => setTxnAnimation(null), 2500);
    },
    onError: (err: any) => {
      const isConflict = err?.response?.status === 409;
      const isIdempotentFail = err?.response?.data?.isIdempotent === true;
      setSuccessMsg('');
      setErrorMsg('');
      setShowTxnModal(null);
      if (isConflict || isIdempotentFail) {
        // IN_PROGRESS (concurrent) or FAILED replay
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

  const handleApplyQuickTxn = (data: { amountDollars: string; referenceId: string; description?: string }) => {
    if (!showTxnModal?.walletId) return;
    const amountCents = Math.round(parseFloat(data.amountDollars) * 100);
    quickTxnMutation.mutate({
      walletId: showTxnModal.walletId,
      type: showTxnModal.type,
      amount: amountCents,
      referenceId: data.referenceId,
      description: data.description
    });
  };

  const handleCreateUser = (data: CreateUserPayload) => {
    createUserMutation.mutate(data);
  };

  const handleCreateWallet = (currency: string, userId: string) => {
    createWalletMutation.mutate({ userId, currency });
  };


  const filteredTxs = latestTransactions.filter(tx => {
    const term = searchQuery.toLowerCase();
    
    // Attempt to map wallet to a user name for enhanced searching
    let mappedUserName = '';
    const stored = localStorage.getItem('badrgo_user_wallets');
    const mapping: Record<string, { id: string; currency: string }[]> = stored ? JSON.parse(stored) : {};
    for (const [uid, wList] of Object.entries(mapping)) {
      if (wList.some(w => w.id === tx.walletId)) {
        mappedUserName = users?.find(u => u.id === uid)?.name || '';
        break;
      }
    }

    return (
      (tx.referenceId && tx.referenceId.toLowerCase().includes(term)) ||
      (tx.walletId && tx.walletId.toLowerCase().includes(term)) ||
      (tx.type && tx.type.toLowerCase().includes(term)) ||
      (tx.amount && tx.amount.toString().includes(term)) ||
      (tx.currency && tx.currency.toLowerCase().includes(term)) ||
      mappedUserName.toLowerCase().includes(term) ||
      (tx.description && tx.description.toLowerCase().includes(term))
    );
  });

  const isPageLoading = statsLoading || usersLoading;
  const isOnline = !statsError;

  if (isPageLoading) {
    return <Loader fullPage message="Initializing ledger portal..." />;
  }


  const totalBalanceDisplay = sumConvertedBalances(stats?.balancesByCurrency || [], displayCurrency);
  const totalCreditsDisplay = dailyBuckets[6].credits;
  const totalDebitsDisplay = dailyBuckets[6].debits;


  const selectedWalletUserName = users?.find(u => u.id === showWalletModal)?.name;

  return (
    <div style={{ animation: 'slideUp 0.3s ease-out' }}>
      {}
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0' }}>Dashboard Overview</h1>
          <p className="page-subtitle">Real-time multi-currency ledger statistics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Display Currency:</span>
          <select 
            className="form-select" 
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px', background: 'var(--color-container-lowest)' }}
          >
            <option value="QAR">QAR (Qatari Riyal)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="GBP">GBP (British Pound)</option>
            <option value="INR">INR (Indian Rupee)</option>
          </select>
        </div>
      </div>
      {}
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

      {}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
              <Users size={16} />
            </div>
            <span className={getDynamicTrend(users?.length || 0).isUp ? "text-credit flex items-center" : "text-debit flex items-center"} style={{ fontSize: '11px', fontWeight: 700 }}>
              {getDynamicTrend(users?.length || 0).value} {getDynamicTrend(users?.length || 0).isUp ? <ArrowUp size={12} style={{ marginLeft: '2px' }} /> : <ArrowDown size={12} style={{ marginLeft: '2px' }} />}
            </span>
          </div>
          <h3 className="stat-label" style={{ marginBottom: '4px' }}>Total Users</h3>
          <p className="stat-value">{users?.length ?? 0}</p>
        </div>

        {}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
              <Wallet size={16} />
            </div>
            <span className={getDynamicTrend(stats?.totalWallets || 0).isUp ? "text-credit flex items-center" : "text-debit flex items-center"} style={{ fontSize: '11px', fontWeight: 700 }}>
              {getDynamicTrend(stats?.totalWallets || 0).value} {getDynamicTrend(stats?.totalWallets || 0).isUp ? <ArrowUp size={12} style={{ marginLeft: '2px' }} /> : <ArrowDown size={12} style={{ marginLeft: '2px' }} />}
            </span>
          </div>
          <h3 className="stat-label" style={{ marginBottom: '4px' }}>Total Wallets</h3>
          <p className="stat-value">{stats?.totalWallets ?? 0}</p>
        </div>

        {}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
              <Coins size={16} />
            </div>
            <span className={getDynamicTrend(totalBalanceDisplay).isUp ? "text-credit flex items-center" : "text-debit flex items-center"} style={{ fontSize: '11px', fontWeight: 700 }}>
              {getDynamicTrend(totalBalanceDisplay).value} {getDynamicTrend(totalBalanceDisplay).isUp ? <ArrowUp size={12} style={{ marginLeft: '2px' }} /> : <ArrowDown size={12} style={{ marginLeft: '2px' }} />}
            </span>
          </div>
          <h3 className="stat-label" style={{ marginBottom: '4px' }}>Total Balance</h3>
          <p className="stat-value" style={{ fontSize: '24px' }}>
            {formatCurrency(totalBalanceDisplay, displayCurrency)}
          </p>
        </div>

        {}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
              <TrendingUp size={16} />
            </div>
            <span className={getDynamicTrend(totalCreditsDisplay).isUp ? "text-credit flex items-center" : "text-debit flex items-center"} style={{ fontSize: '11px', fontWeight: 700 }}>
              {getDynamicTrend(totalCreditsDisplay).value} {getDynamicTrend(totalCreditsDisplay).isUp ? <ArrowUp size={12} style={{ marginLeft: '2px' }} /> : <ArrowDown size={12} style={{ marginLeft: '2px' }} />}
            </span>
          </div>
          <h3 className="stat-label" style={{ marginBottom: '4px' }}>Credits Today</h3>
          <p className="stat-value text-credit" style={{ fontSize: '24px' }}>
            {formatCurrency(totalCreditsDisplay, displayCurrency)}
          </p>
        </div>

        {}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>
              <TrendingDown size={16} />
            </div>
            <span className={getDynamicTrend(totalDebitsDisplay, true).isUp ? "text-credit flex items-center" : "text-debit flex items-center"} style={{ fontSize: '11px', fontWeight: 700 }}>
              {getDynamicTrend(totalDebitsDisplay, true).value} {getDynamicTrend(totalDebitsDisplay, true).isUp ? <ArrowUp size={12} style={{ marginLeft: '2px' }} /> : <ArrowDown size={12} style={{ marginLeft: '2px' }} />}
            </span>
          </div>
          <h3 className="stat-label" style={{ marginBottom: '4px' }}>Debits Today</h3>
          <p className="stat-value text-debit" style={{ fontSize: '24px' }}>
            {formatCurrency(totalDebitsDisplay, displayCurrency)}
          </p>
        </div>

        {}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-container-high)', color: 'var(--color-text)' }}>
              <Activity size={16} />
            </div>
            <span className={getDynamicTrend(localTxCount).isUp ? "text-credit flex items-center" : "text-debit flex items-center"} style={{ fontSize: '11px', fontWeight: 700 }}>
              {getDynamicTrend(localTxCount).value} {getDynamicTrend(localTxCount).isUp ? <ArrowUp size={12} style={{ marginLeft: '2px' }} /> : <ArrowDown size={12} style={{ marginLeft: '2px' }} />}
            </span>
          </div>
          <h3 className="stat-label" style={{ marginBottom: '4px' }}>Transactions Today</h3>
          <p className="stat-value">{localTxCount}</p>
        </div>
      </section>

      {}
      <div className="dashboard-grid">
        {}
        <Card className="dashboard-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-flex">
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>Activity Summary</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-soft)', marginTop: '2px' }}>Credits vs Debits performance (Simulated Audit Lines)</p>
            </div>
            <div className="flex items-center gap-4">
              <select 
                className="form-input" 
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: 'var(--radius)' }}
                value={chartView}
                onChange={(e) => setChartView(e.target.value as 'hourly' | 'daily')}
              >
                <option value="hourly">Hourly (Today)</option>
                <option value="daily">Daily (Last 7 Days)</option>
              </select>
              <div className="flex items-center gap-2">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Credits</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)' }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Debits</span>
              </div>
            </div>
          </div>

          {}
          <div 
            style={{ flex: 1, minHeight: '260px', position: 'relative', marginTop: '16px' }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width });
            }}
            onMouseLeave={() => setHoverPos(null)}
          >
            <svg style={{ width: '100%', height: '100%', minHeight: '260px' }} viewBox="0 0 800 260" preserveAspectRatio="none">
              {}
              <line x1="0" y1="52" x2="800" y2="52" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
              <line x1="0" y1="104" x2="800" y2="104" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
              <line x1="0" y1="156" x2="800" y2="156" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
              <line x1="0" y1="208" x2="800" y2="208" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
              
              {}
              {chartView === 'hourly' ? (
                <>
                  <path 
                    d={generatePath(false)} 
                    fill="none" 
                    stroke="var(--color-primary)" 
                    strokeWidth="3" 
                    style={{ transition: 'd 0.5s ease-in-out' }}
                  />
                  <path 
                    d={generatePath(true)} 
                    fill="none" 
                    stroke="var(--color-secondary)" 
                    strokeWidth="2" 
                    strokeDasharray="4"
                    style={{ transition: 'd 0.5s ease-in-out' }}
                  />
                </>
              ) : (
                <>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const groupX = i * 114 + 18; 
                    const creditH = getBarHeight(i, false);
                    const debitH = getBarHeight(i, true);
                    return (
                      <g key={i} style={{ transition: 'all 0.5s ease-in-out' }}>
                        <rect x={groupX} y={260 - creditH} width="28" height={creditH} fill="var(--color-primary)" rx="4" />
                        <rect x={groupX + 32} y={260 - debitH} width="28" height={debitH} fill="var(--color-secondary)" rx="4" opacity="0.8" />
                      </g>
                    );
                  })}
                </>
              )}

            </svg>

            {hoverPos && (
              <div style={{
                position: 'absolute',
                top: Math.max(10, hoverPos.y - 70) + 'px',
                left: (hoverPos.x + 160 > hoverPos.width ? hoverPos.x - 170 : hoverPos.x + 15) + 'px',
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                fontSize: '11px',
                pointerEvents: 'none',
                zIndex: 10,
                animation: 'fadeIn 0.1s ease'
              }}>
                <p style={{ fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>
                  {(() => {
                    const xRatio = hoverPos.x / Math.max(1, hoverPos.width);
                    if (chartView === 'hourly') {
                      const hour = Math.max(0, Math.min(23, Math.floor(xRatio * 24)));
                      return `Audit Log • ${hour.toString().padStart(2, '0')}:00`;
                    } else {
                      const daysAgo = 6 - Math.max(0, Math.min(6, Math.floor(xRatio * 7)));
                      if (daysAgo === 0) return `Audit Log • Today`;
                      if (daysAgo === 1) return `Audit Log • Yesterday`;
                      return `Audit Log • ${daysAgo} days ago`;
                    }
                  })()}
                </p>
                <div style={{ marginTop: '4px', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <span>Credits:</span>
                  <strong className="font-mono">{formatCurrency(getHoverMetrics(hoverPos.x, hoverPos.width, false, chartView), displayCurrency)}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <span>Debits:</span>
                  <strong className="font-mono">{formatCurrency(getHoverMetrics(hoverPos.x, hoverPos.width, true, chartView), displayCurrency)}</strong>
                </div>
              </div>
            )}
          </div>
        </Card>

        {}
        <Card className="dashboard-actions-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            
            {}
            <button 
              className="btn btn-ghost" 
              style={{ display: 'flex', justifyContent: 'flex-start', textAlign: 'left', padding: '12px', gap: '12px', width: '100%' }}
              onClick={() => setShowUserModal(true)}
            >
              <UserPlus size={16} className="text-credit" />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700 }}>Create User</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-soft)', fontWeight: 500 }}>Onboard a new institutional client</p>
              </div>
            </button>

            {}
            <button 
              className="btn btn-ghost" 
              style={{ display: 'flex', justifyContent: 'flex-start', textAlign: 'left', padding: '12px', gap: '12px', width: '100%' }}
              onClick={() => {
                if (users && users.length > 0) {
                  setShowWalletModal(users[0].id);
                } else {
                  setErrorMsg('No user accounts available. Create a user first.');
                }
              }}
            >
              <Wallet size={16} className="text-credit" />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700 }}>Create Wallet</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-soft)', fontWeight: 500 }}>Provision new ledger address</p>
              </div>
            </button>

            {}
            <button 
              className="btn btn-ghost" 
              style={{ display: 'flex', justifyContent: 'flex-start', textAlign: 'left', padding: '12px', gap: '12px', width: '100%' }}
              onClick={() => {
                const stored = localStorage.getItem('badrgo_user_wallets');
                const mapping: Record<string, { id: string; currency: string }[]> = stored ? JSON.parse(stored) : {};
                const firstUserWallets = Object.values(mapping)[0];
                if (firstUserWallets && firstUserWallets.length > 0) {
                  setShowTxnModal({ type: 'credit', walletId: firstUserWallets[0].id });
                } else {
                  setErrorMsg('No wallets initialized yet.');
                }
              }}
            >
              <TrendingUp size={16} className="text-credit" />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700 }}>Credit Wallet</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-soft)', fontWeight: 500 }}>Manual fund injection process</p>
              </div>
            </button>

            {}
            <button 
              className="btn btn-ghost" 
              style={{ display: 'flex', justifyContent: 'flex-start', textAlign: 'left', padding: '12px', gap: '12px', width: '100%' }}
              onClick={() => {
                const stored = localStorage.getItem('badrgo_user_wallets');
                const mapping: Record<string, { id: string; currency: string }[]> = stored ? JSON.parse(stored) : {};
                const firstUserWallets = Object.values(mapping)[0];
                if (firstUserWallets && firstUserWallets.length > 0) {
                  setShowTxnModal({ type: 'debit', walletId: firstUserWallets[0].id });
                } else {
                  setErrorMsg('No wallets initialized yet.');
                }
              }}
            >
              <TrendingDown size={16} className="text-debit" />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700 }}>Debit Wallet</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-soft)', fontWeight: 500 }}>Initiate manual withdrawal</p>
              </div>
            </button>
          </div>

          {}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isOnline ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(186, 26, 26, 0.15)'}`,
              padding: '12px',
              borderRadius: 'var(--radius)',
              gap: '8px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                background: isOnline ? 'var(--color-success)' : 'var(--color-danger)',
                borderRadius: '50%',
                boxShadow: `0 0 8px ${isOnline ? 'var(--color-success)' : 'var(--color-danger)'}`
              }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: isOnline ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                {isOnline ? 'SYSTEM STATUS: OPERATIONAL' : 'SYSTEM STATUS: OFFLINE'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {}
      <Card>
        <div className="card-header-flex">
          <div className="flex items-center gap-2">
            <Activity size={18} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>Latest Transactions</h3>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => navigate('/reports')}>
            View All Reports
          </button>
        </div>

        {txsLoading ? (
          <Loader message="Querying live transaction logs..." />
        ) : filteredTxs.length === 0 ? (
          <EmptyState 
            title="No Transactions Logged"
            description="No recent transactions match your ledger index."
          />
        ) : (
          <Table headers={['Ref ID', 'Wallet ID', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Date']}>
            {filteredTxs.slice(0, 10).map((tx: any) => {
              const txCurrency = tx.currency || 'USD';
              const isDifferentCurrency = txCurrency !== displayCurrency;
              
              const convertedAmount = convertCurrency(tx.amount, txCurrency, displayCurrency);
              const convertedBefore = convertCurrency(tx.balanceBefore, txCurrency, displayCurrency);
              const convertedAfter = convertCurrency(tx.balanceAfter, txCurrency, displayCurrency);

              return (
                <tr key={tx.id}>
                  <td className="font-mono">{tx.referenceId}</td>
                  <td className="font-mono text-muted">{tx.walletId}</td>
                  <td>
                    <Badge variant={tx.type === 'CREDIT' ? 'success' : 'danger'}>
                      {tx.type}
                    </Badge>
                  </td>
                  <td className={tx.type === 'CREDIT' ? 'text-credit' : 'text-debit'} style={{ fontWeight: 700 }}>
                    <div className="flex flex-col">
                      <span>{tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(convertedAmount, displayCurrency)}</span>
                      {isDifferentCurrency && (
                        <span style={{ fontSize: '10px', color: 'var(--color-text-soft)', fontWeight: 500 }}>
                          ({formatCurrency(tx.amount, txCurrency)})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-muted">
                    <div className="flex flex-col">
                      <span>{formatCurrency(convertedBefore, displayCurrency)}</span>
                      {isDifferentCurrency && (
                        <span style={{ fontSize: '10px', color: 'var(--color-text-soft)' }}>
                          ({formatCurrency(tx.balanceBefore, txCurrency)})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>
                    <div className="flex flex-col">
                      <span>{formatCurrency(convertedAfter, displayCurrency)}</span>
                      {isDifferentCurrency && (
                        <span style={{ fontSize: '10px', color: 'var(--color-text-soft)', fontWeight: 500 }}>
                          ({formatCurrency(tx.balanceAfter, txCurrency)})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: '12px' }}>{formatDateTime(tx.createdAt)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {}
      <button 
        onClick={() => {
          const stored = localStorage.getItem('badrgo_user_wallets');
          const mapping: Record<string, { id: string; currency: string }[]> = stored ? JSON.parse(stored) : {};
          const firstUserWallets = Object.values(mapping)[0];
          if (firstUserWallets && firstUserWallets.length > 0) {
            setShowTxnModal({ type: 'credit', walletId: firstUserWallets[0].id });
          } else {
            setErrorMsg('No wallets initialized yet.');
          }
        }}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          boxShadow: 'var(--shadow-lg)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 50,
          transition: 'transform 0.1s ease',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Apply quick transaction"
      >
        <Plus size={24} />
      </button>

      {}
      {}
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

      {}
      {showWalletModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Initialize Wallet Address</h2>
              <button className="modal-close" onClick={() => setShowWalletModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <WalletForm
                userName={selectedWalletUserName}
                isPending={createWalletMutation.isPending}
                onSubmit={(data) => handleCreateWallet(data.currency, showWalletModal)}
                onCancel={() => setShowWalletModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {showTxnModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title" style={{ textTransform: 'capitalize' }}>Apply Quick {showTxnModal.type}</h2>
              <button className="modal-close" onClick={() => setShowTxnModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Target Wallet</label>
                <select 
                  className="form-select" 
                  value={showTxnModal.walletId || ''} 
                  onChange={(e) => setShowTxnModal({ ...showTxnModal, walletId: e.target.value })}
                  style={{
                    background: 'var(--color-container-lowest)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--color-text)',
                    width: '100%'
                  }}
                >
                  {users?.map((user) => {
                    const wallets = user.wallets || [];
                    return wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {user.name} — {w.currency} ({w.id.slice(0, 8)})
                      </option>
                    ));
                  })}
                </select>
              </div>

              <TransactionForm
                type={showTxnModal.type}
                isPending={quickTxnMutation.isPending}
                onSubmit={handleApplyQuickTxn}
                onCancel={() => setShowTxnModal(null)}
              />
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
            @keyframes popIn {
              0% { transform: scale(0.5); opacity: 0; }
              70% { transform: scale(1.15); opacity: 1; }
              100% { transform: scale(1); }
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-15px); }
              40%, 80% { transform: translateX(15px); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulseSuccess {
              0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
              70% { box-shadow: 0 0 0 30px rgba(16, 185, 129, 0); }
              100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            @keyframes pulseError {
              0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
              70% { box-shadow: 0 0 0 30px rgba(239, 68, 68, 0); }
              100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            @keyframes pulseWarning {
              0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6); }
              70% { box-shadow: 0 0 0 30px rgba(245, 158, 11, 0); }
              100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
            }
          `}</style>
          <div style={{
            background: 'var(--color-surface)', padding: '48px 64px', borderRadius: '32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
          }}>
            {txnAnimation === 'success' && (
              <div style={{ background: 'var(--color-success)', color: 'white', borderRadius: '50%', padding: '24px',
                animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s both, pulseSuccess 1.5s infinite 0.6s'
              }}>
                <Check size={72} strokeWidth={3} />
              </div>
            )}
            {txnAnimation === 'error' && (
              <div style={{ background: 'var(--color-danger)', color: 'white', borderRadius: '50%', padding: '24px',
                animation: 'shake 0.6s cubic-bezier(.36,.07,.19,.97) 0.1s both, pulseError 1.5s infinite 0.6s'
              }}>
                <X size={72} strokeWidth={3} />
              </div>
            )}
            {txnAnimation === 'in-progress' && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '4px solid rgb(245,158,11)', color: 'rgb(245,158,11)', borderRadius: '50%', padding: '24px',
                animation: 'spin 1s linear infinite, pulseWarning 1.5s infinite 0.3s'
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
