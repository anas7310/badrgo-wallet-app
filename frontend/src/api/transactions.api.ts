import apiClient from './axios';
import type { Transaction, TransactionPayload } from '../types/transaction.types';

export const transactionsApi = {
  getByWallet: (walletId: string): Promise<Transaction[]> =>
    apiClient.get(`/wallets/${walletId}/transactions`).then((res) => res.data),

  getAll: (): Promise<(Transaction & { currency: string })[]> =>
    apiClient.get('/wallets/all/transactions').then((res) => res.data),

  credit: (walletId: string, payload: TransactionPayload): Promise<Transaction> =>
    apiClient.post(`/wallets/${walletId}/credit`, payload, {
      headers: { 'Idempotency-Key': payload.referenceId }
    }).then((res) => res.data),

  debit: (walletId: string, payload: TransactionPayload): Promise<Transaction> =>
    apiClient.post(`/wallets/${walletId}/debit`, payload, {
      headers: { 'Idempotency-Key': payload.referenceId }
    }).then((res) => res.data),
};
