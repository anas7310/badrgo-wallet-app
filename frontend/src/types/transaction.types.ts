export interface Transaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number; 
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  description?: string;
  createdAt: string;
}

export interface TransactionPayload {
  amount: number; 
  referenceId: string;
  description?: string;
}
