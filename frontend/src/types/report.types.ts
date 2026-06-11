import type { Transaction } from './transaction.types';

export interface DailySummary {
  date: string;
  creditsByCurrency: { currency: string; amount: number }[];   
  debitsByCurrency: { currency: string; amount: number }[];    
  transactionCount: number;
  activeWallets: number;
  transactions: Transaction[];
}
