export interface Wallet {
  id: string;
  userId: string;
  currency: string;
  balance: number; 
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletPayload {
  userId: string;
  currency?: string;
}

export interface WalletStats {
  totalWallets: number;
  balancesByCurrency: { currency: string; balance: number }[]; 
  activeWallets: number;
}
