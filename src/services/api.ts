import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Countdown, CreateCountdownRequest, UpdateCountdownRequest, User, UserSettings } from '../types';

// Replace with your actual backend URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth services
export const authService = {
  async login(email: string, password: string) {
    const response = await api.post<{ user: User; token: string }>('/api/auth/login', { email, password });
    await SecureStore.setItemAsync('authToken', response.data.token);
    return response.data;
  },

  async logout() {
    await api.post('/api/auth/logout');
    await SecureStore.deleteItemAsync('authToken');
  },

  async getUser() {
    const response = await api.get<{ user: User }>('/api/auth/user');
    return response.data.user;
  },

  async register(email: string, password: string, name?: string) {
    const response = await api.post<{ user: User; token: string }>('/api/auth/register', { email, password, name });
    await SecureStore.setItemAsync('authToken', response.data.token);
    return response.data;
  },
};

// Countdown services
export const countdownService = {
  async getAll() {
    const response = await api.get<Countdown[]>('/api/countdowns');
    return response.data;
  },

  async create(data: CreateCountdownRequest) {
    const response = await api.post<Countdown>('/api/countdowns', data);
    return response.data;
  },

  async update(id: number, data: UpdateCountdownRequest) {
    const response = await api.put<Countdown>(`/api/countdowns/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/api/countdowns/${id}`);
  },

  async toggleFavorite(id: number) {
    const response = await api.patch<Countdown>(`/api/countdowns/${id}/favorite`);
    return response.data;
  },
};

// Settings services
export const settingsService = {
  async getUserSettings() {
    const response = await api.get<UserSettings>('/api/settings');
    return response.data;
  },

  async togglePremium(isPremium: boolean) {
    const response = await api.put<UserSettings>('/api/settings/premium', { isPremium });
    return response.data;
  },
};