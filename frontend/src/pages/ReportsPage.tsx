import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, sumConvertedBalances } from '../utils/currency';
import { formatDate, formatDateTime } from '../utils/format-date';
import { Calendar, TrendingUp, TrendingDown, Activity, Wallet, AlertCircle, RefreshCw, FileText } from 'lucide-react';

export function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [displayCurrency, setDisplayCurrency] = useState('QAR');

  const {
    data: summary,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['daily-summary', selectedDate],
    queryFn: () => reportsApi.getDailySummary(selectedDate),
    enabled: !!selectedDate,
  });

  const totalCreditsDisplay = sumConvertedBalances(summary?.creditsByCurrency || [], displayCurrency);
  const totalDebitsDisplay = sumConvertedBalances(summary?.debitsByCurrency || [], displayCurrency);
  const totalVolume = totalCreditsDisplay + totalDebitsDisplay;
  const creditPercent = totalVolume > 0 ? (totalCreditsDisplay / totalVolume) * 100 : 50;
  const debitPercent = totalVolume > 0 ? (totalDebitsDisplay / totalVolume) * 100 : 50;

  return (
    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
      {}
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 className="page-title">Daily Operations Report</h1>
          <p className="page-subtitle">Inspect audit summaries and cash flow splits per day</p>
        </div>

        <div className="flex items-center" style={{ gap: '20px' }}>
          <select 
            className="form-select" 
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px', background: 'var(--color-container-lowest)' }}
          >
            <option value="QAR">QAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
          </select>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
          }}>
            <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text)',
                fontFamily: 'inherit',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: '10px', borderRadius: 'var(--radius-sm)' }}
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            title="Refresh Report Data"
          >
            <RefreshCw size={14} className={isFetching ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loader message="Compiling report audit logs..." />
      ) : error ? (
        <div className="error-state flex items-center gap-2">
          <AlertCircle size={16} />
          <span>⚠️ Failed to fetch report metrics: {(error as Error).message}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary Metrics */}
          <div className="stats-grid">
            <Card className="stat-card" hoverable>
              <div className="stat-header">
                <span className="stat-label">Deposits (Credits)</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="stat-value text-credit">{formatCurrency(totalCreditsDisplay, displayCurrency)}</div>
              <div className="stat-sub">Funds credited on {formatDate(selectedDate)}</div>
            </Card>

            <Card className="stat-card" hoverable>
              <div className="stat-header">
                <span className="stat-label">Withdrawals (Debits)</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="stat-value text-debit">{formatCurrency(totalDebitsDisplay, displayCurrency)}</div>
              <div className="stat-sub">Funds debited on {formatDate(selectedDate)}</div>
            </Card>

            <Card className="stat-card" hoverable>
              <div className="stat-header">
                <span className="stat-label">Total Transactions</span>
                <div className="stat-icon-wrapper" style={{ background: 'var(--color-container-high)', color: 'var(--color-text-soft)', border: '1px solid var(--color-border)' }}>
                  <Activity size={18} />
                </div>
              </div>
              <div className="stat-value">{summary?.transactionCount ?? 0}</div>
              <div className="stat-sub">Operations executed on this date</div>
            </Card>

            <Card className="stat-card" hoverable>
              <div className="stat-header">
                <span className="stat-label">Active Wallets</span>
                <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
                  <Wallet size={18} />
                </div>
              </div>
              <div className="stat-value">{summary?.activeWallets ?? 0}</div>
              <div className="stat-sub">Distinct wallets transacting today</div>
            </Card>
          </div>

          {}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--color-text)' }}>
              Operations Flow Audit — {formatDate(selectedDate)}
            </h3>

            {totalVolume > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-soft)', marginBottom: '4px' }}>
                    <span>Ratio Split</span>
                    <span>Credits {creditPercent.toFixed(1)}% vs {debitPercent.toFixed(1)}% Debits</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '12px' }}>
                    <div 
                      className="progress-bar-segment" 
                      style={{ width: `${creditPercent}%`, background: 'var(--color-success)' }} 
                    />
                    <div 
                      className="progress-bar-segment" 
                      style={{ width: `${debitPercent}%`, background: 'var(--color-danger)' }} 
                    />
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  background: 'var(--color-container-low)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Net Cash Flow</span>
                    <span style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: totalCreditsDisplay - totalDebitsDisplay >= 0 ? 'var(--color-success)' : 'var(--color-danger)' 
                    }}>
                      {totalCreditsDisplay - totalDebitsDisplay >= 0 ? '+' : ''}
                      {formatCurrency(totalCreditsDisplay - totalDebitsDisplay, displayCurrency)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Transacted Amount</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {formatCurrency(totalVolume, displayCurrency)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Average Transaction Value</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {summary?.transactionCount && summary.transactionCount > 0 
                        ? formatCurrency(Math.round(totalVolume / summary.transactionCount), displayCurrency) 
                        : '$0.00'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '48px 24px', 
                color: 'var(--color-text-muted)',
                gap: '8px'
              }}>
                <Calendar size={32} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>No operations recorded</span>
                <span style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                  There were no credits or debits issued on {formatDate(selectedDate)}. Change the date filter above to view historical details.
                </span>
              </div>
            )}
          </Card>
          <Card>
            <div className="card-header-flex" style={{ marginBottom: '20px' }}>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                  Transaction Ledger — {formatDate(selectedDate)}
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-soft)', fontWeight: 600 }}>
                {summary?.transactions?.length || 0} records
              </span>
            </div>

            {summary?.transactions && summary.transactions.length > 0 ? (
              <Table headers={['Type', 'Reference ID', 'Amount', 'Bal. Before', 'Bal. After', 'Description', 'Time']}>
                {summary.transactions.map((tx: any) => {
                  const txCurrency = tx.wallet?.currency || displayCurrency;
                  return (
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
                        {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount, txCurrency)}
                      </td>
                      <td>{formatCurrency(tx.balanceBefore, txCurrency)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formatCurrency(tx.balanceAfter, txCurrency)}</td>
                      <td>
                        <span style={{ color: tx.description ? 'var(--color-text-soft)' : 'var(--color-text-muted)', fontSize: '12px' }}>
                          {tx.description || '—'}
                        </span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '12px' }}>{formatDateTime(tx.createdAt)}</td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No detailed records available for this date.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
