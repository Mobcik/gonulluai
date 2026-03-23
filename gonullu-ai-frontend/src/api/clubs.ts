import api from './client';
import type { Club, Event } from '../types';

export const clubsApi = {
  list: () =>
    api.get<Club[]>('/clubs'),

  myMemberships: () =>
    api.get<Club[]>('/clubs/me/memberships'),

  get: (id: string) =>
    api.get<Club>(`/clubs/${id}`),

  create: (data: Partial<Club>) =>
    api.post<Club>('/clubs', data),

  update: (id: string, data: Partial<Pick<Club, 'description' | 'name'>> & { announcement?: string | null }) =>
    api.put<Club>(`/clubs/${id}`, data),

  join: (id: string) =>
    api.post(`/clubs/${id}/join`),

  getEvents: (id: string) =>
    api.get<Event[]>(`/clubs/${id}/events`),
};
