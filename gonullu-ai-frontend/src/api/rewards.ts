import api from './client';
import type { DigitalReward, LeaderboardEntry, Notification } from '../types';

export const rewardsApi = {
  list: () =>
    api.get<DigitalReward[]>('/rewards'),

  myUnlocks: () =>
    api.get<DigitalReward[]>('/rewards/my-unlocks'),

  downloadCertificate: async () => {
    const response = await api.get('/rewards/certificate', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gonulluai-sertifika.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const leaderboardApi = {
  get: (params?: { period?: 'week' | 'month' | 'all'; city?: string }) =>
    api.get<LeaderboardEntry[]>('/leaderboard', { params }),
};

export const notificationsApi = {
  list: (page = 1) =>
    api.get<Notification[]>('/notifications', { params: { page } }),

  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count'),

  readAll: () =>
    api.put('/notifications/read-all'),

  readOne: (id: string) =>
    api.put(`/notifications/${id}/read`),
};
