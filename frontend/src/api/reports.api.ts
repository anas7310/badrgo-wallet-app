import apiClient from './axios';
import type { DailySummary } from '../types/report.types';

export const reportsApi = {
  getDailySummary: (date?: string): Promise<DailySummary> =>
    apiClient.get('/reports/daily-summary', { params: { date } }).then((res) => res.data),
};
