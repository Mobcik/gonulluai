import api from './client';
import type { User } from '../types';

export interface RegisterPayload {
  email:     string;
  password:  string;
  full_name: string;
  city?:     string;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface AuthResponse {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  user:          User;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get<User>('/auth/me'),

  verifyEmail: (token: string) =>
    api.get(`/auth/verify?token=${token}`),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  refreshToken: (refresh: string) =>
    api.post<{ access_token: string }>('/auth/refresh', { refresh }),
};
