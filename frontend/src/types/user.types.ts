export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  wallets?: { id: string; currency: string; balance?: number }[];
}

export interface CreateUserPayload {
  name: string;
  phone: string;
  email: string;
}
