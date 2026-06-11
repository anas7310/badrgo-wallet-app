import apiClient from './axios';
import type { Wallet, CreateWalletPayload, WalletStats } from '../types/wallet.types';

export const walletsApi = {
  getAll: (): Promise<Wallet[]> =>
    apiClient.get('/wallets').then((res) => res.data),

  getById: (id: string): Promise<Wallet> =>
    apiClient.get(`/wallets/${id}`).then((res) => res.data),

  create: (payload: CreateWalletPayload): Promise<Wallet> =>
    apiClient.post('/wallets', payload).then((res) => res.data),

  getStats: (): Promise<WalletStats> =>
    apiClient.get('/wallets/stats').then((res) => res.data),
};
