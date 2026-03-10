import api from './client';
import type { Event, Comment, PhotoItem, VerificationMethod } from '../types';

export interface EventFilters {
  category?: string;
  city?:     string;
  status?:   string;
  q?:        string;
  page?:     number;
}

export interface CreateEventPayload {
  title:               string;
  short_description:   string;
  description:         string;
  category:            string;
  city:                string;
  address?:            string;
  meeting_point?:      string;
  event_date:          string;
  end_time?:           string;
  max_participants?:   number;
  required_skills:     string[];
  preparation_notes?:  string;
  contact_info?:       string;
  verification_method: VerificationMethod;
  cover_photo_url?:    string;
}

export const eventsApi = {
  /** Kullanıcı profiline göre AI sıralamalı etkinlik listesi */
  discover: (params?: EventFilters) =>
    api.get<Event[]>('/events/discover', { params }),

  /** Standart etkinlik listesi (giriş gerekmez) */
  list: (params?: EventFilters) =>
    api.get<Event[]>('/events', { params }),

  get: (id: string) =>
    api.get<Event>(`/events/${id}`),

  create: (data: CreateEventPayload) =>
    api.post<Event>('/events', data),

  update: (id: string, data: Partial<CreateEventPayload>) =>
    api.put<Event>(`/events/${id}`, data),

  delete: (id: string) =>
    api.delete(`/events/${id}`),

  /** Etkinliğe katıl — puan etkinlik günü doğrulama ile verilir */
  join: (id: string) =>
    api.post<{ message: string }>(`/events/${id}/join`),

  leave: (id: string) =>
    api.delete<{ message: string }>(`/events/${id}/join`),

  /** Organizatör etkinliği tamamlandı işaretler; doğrulanan katılımcılara +25 bonus */
  complete: (id: string) =>
    api.post<{ message: string; verified_count: number }>(`/events/${id}/complete`),

  /** Katılımcı 6 haneli doğrulama koduyla varlığını kanıtlar (+35 puan) */
  verify: (id: string, code: string) =>
    api.post<{ message: string }>(`/events/${id}/verify`, null, { params: { code } }),

  getParticipants: (id: string) =>
    api.get(`/events/${id}/participants`),

  getPhotos: (id: string) =>
    api.get<PhotoItem[]>(`/events/${id}/photos`),

  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; message: string }>(`/events/${id}/photos`, formData);
  },

  getComments: (id: string) =>
    api.get<Comment[]>(`/events/${id}/comments`),

  addComment: (id: string, content: string, rating?: number) =>
    api.post<Comment>(`/events/${id}/comments`, { content, rating }),

  /** Gemini ile etkinlik kısa + detaylı açıklaması üret */
  generateDescription: (title: string, category: string, city: string, short_desc?: string) =>
    api.post<{ short_description: string; description: string }>(
      '/events/ai-generate-description',
      { title, category, city, short_desc },
    ),
};
