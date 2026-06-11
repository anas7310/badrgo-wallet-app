import apiClient from './axios';
import type { User, CreateUserPayload } from '../types/user.types';

export const usersApi = {
  getAll: (): Promise<User[]> =>
    apiClient.get('/users').then((res) => res.data),

  create: (payload: CreateUserPayload): Promise<User> =>
    apiClient.post('/users', payload).then((res) => res.data),
};
