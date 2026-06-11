import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from '../api/wallets.api';
import { transactionsApi } from '../api/transactions.api';
import { usersApi } from '../api/users.api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { TransactionForm } from '../components/forms/TransactionForm';
import { formatCurrency } from '../utils/currency';
import { formatDateTime } from '../utils/format-date';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  User, 
  Activity, 
  Copy, 
  Check, 
  AlertTriangle,
  FileText
} from 'lucide-react';

export function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeAction, setActiveAction] = useState<'credit' | 'debit' | null>(null);
  const [copied, setCopied] = useState(false);
  
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');


  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
  } = useQuery({
    queryKey: ['wallet', id],
    queryFn: () => walletsApi.getById(id!),
    enabled: !!id,
  });

  
  const {
    data: transactions,
    isLoading: txLoading,
  } = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => transactionsApi.getByWallet(id!),
    enabled: !!id,
  });

  
  const {
    data: users,
  } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    enabled: !!wallet?.userId,
  });

  const owner = users?.find((u) => u.id === wallet?.userId);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    const handleSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent<string>).detail || '');
      setCurrentPage(1); // reset to page 1 on new search
    };

    window.addEventListener('global-search', handleSearch);
    return () => {
      window.removeEventListener('global-search', handleSearch);
    };
  }, []);

  
  const filteredTransactions = transactions?.filter((tx) => 
    tx.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) ?? [];

  
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  
  useEffect(() => {
    if (wallet) {
      try {
        const recentStored = localStorage.getItem('badrgo_recent_wallets');
        const recent = recentStored ? JSON.parse(recentStored) : [];
        const filtered = recent.filter((w: { id: string }) => w.id !== wallet.id);
        filtered.unshift({ id: wallet.id, currency: wallet.currency });
        localStorage.setItem('badrgo_recent_wallets', JSON.stringify(filtered.slice(0, 5)));
        
        
        window.dispatchEvent(new Event('recent_wallets_updated'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [wallet]);

  
  const handleCopyId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  
  const creditMutation = useMutation({
    mutationFn: (payload: { amount: number; referenceId: string; description?: string }) => 
      transactionsApi.credit(id!, payload),
    onSuccess: (tx: any) => {
      queryClient.invalidateQueries({ queryKey: ['wallet', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      if (tx.isIdempotent) {
        setSuccessMsg(`payment with this referenceId already processed, Try with new payment`);
      } else {
        setSuccessMsg('Credit applied successfully!');
      }
      setErrorMsg('');
      setActiveAction(null);
    },
    onError: (err: any) => { 
      const isConflict = err?.response?.status === 409;
      const isIdempotentFail = err?.response?.data?.isIdempotent === true;
      if (isConflict || isIdempotentFail) {
        setErrorMsg('Payment in progress.');
      } else {
        setErrorMsg(err?.response?.data?.message || err.message);
      }
      setSuccessMsg(''); 
    },
  });


  const debitMutation = useMutation({
    mutationFn: (payload: { amount: number; referenceId: string; description?: string }) => 
      transactionsApi.debit(id!, payload),
    onSuccess: (tx: any) => {
      queryClient.invalidateQueries({ queryKey: ['wallet', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      if (tx.isIdempotent) {
        setSuccessMsg(`payment with this referenceId already processed, Try with new payment`);
      } else {
        setSuccessMsg('Debit applied successfully!');
      }
      setErrorMsg('');
      setActiveAction(null);
    },
    onError: (err: any) => { 
      const isConflict = err?.response?.status === 409;
      const isIdempotentFail = err?.response?.data?.isIdempotent === true;
      if (isConflict || isIdempotentFail) {
        setErrorMsg('Payment in progress.');
      } else {
        setErrorMsg(err?.response?.data?.message || err.message);
      }
      setSuccessMsg(''); 
    },
  });

  const handleTransactionSubmit = (data: { amountDollars: string; referenceId: string; description?: string }) => {
    setSuccessMsg('');
    setErrorMsg('');
    const amountCents = Math.round(parseFloat(data.amountDollars) * 100);
    const payload = {
      amount: amountCents,
      referenceId: data.referenceId,
      description: data.description,
    };
    
    if (activeAction === 'credit') {
      creditMutation.mutate(payload);
    } else {
      debitMutation.mutate(payload);
    }
  };

  const isMutationPending = creditMutation.isPending || debitMutation.isPending;

  if (walletLoading) {
    return <Loader fullPage message="Retrieving wallet metrics..." />;
  }

  if (walletError) {
    return (
      <div className="flex flex-col gap-4" style={{ animation: 'slideUp 0.4s ease' }}>
        <button 
          onClick={() => navigate('/users')}
          className="btn btn-ghost" 
          style={{ width: 'fit-content', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </button>
        <div className="error-state flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>⚠️ {(walletError as Error).message}</span>
        </div>
      </div>
    );
  }

  if (!wallet) return null;

  return (
    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
      {}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => navigate('/users')}
            className="btn btn-ghost" 
            style={{ width: 'fit-content', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Users</span>
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="page-title">{wallet.currency} Transaction Wallet</h1>
            <button 
              className="btn btn-ghost" 
              onClick={handleCopyId}
              style={{ padding: '4px', borderRadius: '50%', border: 'none', background: 'transparent' }}
              title="Copy Wallet UUID"
            >
              {copied ? <Check size={14} className="text-credit" /> : <Copy size={14} style={{ opacity: 0.6 }} />}
            </button>
          </div>
          <p className="font-mono text-muted" style={{ fontSize: '11px' }}>UUID: {wallet.id}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="success"
            icon={<ArrowUpRight size={16} />}
            onClick={() => { setActiveAction(activeAction === 'credit' ? null : 'credit'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            Credit Wallet
          </Button>
          <Button
            variant="danger"
            icon={<ArrowDownLeft size={16} />}
            onClick={() => { setActiveAction(activeAction === 'debit' ? null : 'debit'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            Debit Wallet
          </Button>
        </div>
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

      {/* Forms Drawer/Card */}
      {activeAction && (
        <Card className="mb-6" style={{ borderLeft: `4px solid ${activeAction === 'credit' ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
          <div className="card-header-flex">
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
              {activeAction === 'credit' ? '↑ Credit Wallet Account' : '↓ Debit Wallet Account'}
            </h2>
            <button 
              className="modal-close" 
              onClick={() => setActiveAction(null)}
              style={{ padding: '2px' }}
            >
              ×
            </button>
          </div>
          <TransactionForm 
            type={activeAction}
            isPending={isMutationPending}
            onSubmit={handleTransactionSubmit}
            onCancel={() => setActiveAction(null)}
          />
        </Card>
      )}

      {}
      <div className="wallet-detail-grid">
        {}
        <Card className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-header">
            <span className="stat-label">Available Balance</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '36px' }}>{formatCurrency(wallet.balance, wallet.currency)}</div>
          <div className="stat-sub">
            Status: 
            <Badge variant={wallet.status === 'ACTIVE' ? 'success' : 'danger'} style={{ marginLeft: '6px' }}>
              {wallet.status}
            </Badge>
          </div>
        </Card>

        {}
        <Card>
          <div className="stat-header">
            <span className="stat-label">Account Owner</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-container-high)', color: 'var(--color-text-soft)', border: '1px solid var(--color-border)' }}>
              <User size={18} />
            </div>
          </div>
          {owner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>{owner.name}</span>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', color: 'var(--color-text-soft)' }}>
                <span>Email: {owner.email}</span>
                <span>Phone: {owner.phone}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                User Status: <strong>{owner.status}</strong>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-soft)' }}>Owner UUID:</span>
              <span className="font-mono text-muted" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{wallet.userId}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '6px' }}>
                Owner details not found in directory.
              </span>
            </div>
          )}
        </Card>
      </div>

      {}
      <Card>
        <div className="card-header-flex">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-credit" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>Transaction Logs</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-soft)', fontWeight: 600 }}>
            {filteredTransactions.length} of {transactions?.length ?? 0} records
          </span>
        </div>

        {txLoading ? (
          <Loader message="Loading transaction logs..." />
        ) : !transactions?.length ? (
          <EmptyState 
            icon={<FileText size={40} style={{ opacity: 0.4 }} />}
            title="No Transactions"
            description="Perform a credit or debit operation to post the first transaction."
          />
        ) : !filteredTransactions.length ? (
          <EmptyState 
            icon={<FileText size={40} style={{ opacity: 0.4 }} />}
            title="No Matching Transactions"
            description="Refine your search parameters to locate other transaction indexes."
          />
        ) : (
          <>
            <Table headers={['Type', 'Reference ID', 'Amount', 'Bal. Before', 'Bal. After', 'Description', 'Date']}>
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <Badge variant={tx.type === 'CREDIT' ? 'success' : 'danger'}>
                      {tx.type === 'CREDIT' ? '↑ CREDIT' : '↓ DEBIT'}
                    </Badge>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>{tx.referenceId}</span>
                  </td>
                  <td className={tx.type === 'CREDIT' ? 'text-credit' : 'text-debit'} style={{ fontWeight: 700, fontSize: '14px' }}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount, wallet.currency)}
                  </td>
                  <td>{formatCurrency(tx.balanceBefore, wallet.currency)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formatCurrency(tx.balanceAfter, wallet.currency)}</td>
                  <td>
                    <span style={{ color: tx.description ? 'var(--color-text-soft)' : 'var(--color-text-muted)', fontSize: '12px' }}>
                      {tx.description || '—'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '12px' }}>{formatDateTime(tx.createdAt)}</td>
                </tr>
              ))}
            </Table>
            
            {}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--color-container-low)',
                borderTop: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                marginTop: '16px',
                borderRadius: '0 0 var(--radius) var(--radius)'
              }}>
                <span>
                  Showing page {currentPage} of {totalPages} ({filteredTransactions.length} items)
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
