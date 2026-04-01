declare const process: { env: Record<string, string | undefined> };

import { AiAssistantResponse, AiJobImprovement, AiQuoteSuggestion, AuthResponse, Booking, BookingStatus, Category, ChatRoom, MeResponse, Review, SavedWorker, WorkerCard } from '../types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (payload: unknown) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: unknown) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token: string) => request<MeResponse>('/api/auth/me', {}, token),
  categories: () => request<Category[]>('/api/categories'),
  discoverWorkers: (params: { categoryCode?: string; latitude?: number; longitude?: number; maxBudget?: number }) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
    });
    return request<WorkerCard[]>(`/api/workers/discover?${search.toString()}`);
  },
  updateWorkerProfile: (token: string, payload: unknown) => request('/api/workers/me', { method: 'PATCH', body: JSON.stringify(payload) }, token),
  workerProfile: (token: string) => request('/api/workers/me', {}, token),
  createBooking: (token: string, payload: unknown) => request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(payload) }, token),
  bookings: (token: string) => request<Booking[]>('/api/bookings', {}, token),
  openBookings: (token: string) => request<Booking[]>('/api/bookings/open', {}, token),
  acceptBooking: (token: string, bookingId: string) => request<Booking>(`/api/bookings/${bookingId}/accept`, { method: 'PATCH' }, token),
  updateBookingStatus: (token: string, bookingId: string, status: BookingStatus) =>
    request<Booking>(`/api/bookings/${bookingId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  chatRoom: (token: string, bookingId: string) => request<ChatRoom>(`/api/chat/bookings/${bookingId}`, {}, token),
  sendMessage: (token: string, bookingId: string, message: string) =>
    request(`/api/chat/bookings/${bookingId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }, token),
  improveJobDraft: (token: string, payload: { categoryCode: string; title: string; description: string; address?: string; budget?: number; expectedHours?: number }) =>
    request<AiJobImprovement>('/api/ai/jobs/improve', { method: 'POST', body: JSON.stringify(payload) }, token),
  suggestJobQuote: (token: string, payload: { categoryCode: string; title: string; description: string; expectedHours: number }) =>
    request<AiQuoteSuggestion>('/api/ai/jobs/quote', { method: 'POST', body: JSON.stringify(payload) }, token),
  askBookingAssistant: (token: string, bookingId: string, question: string) =>
    request<AiAssistantResponse>(`/api/ai/bookings/${bookingId}/assistant`, { method: 'POST', body: JSON.stringify({ question }) }, token),
  askSupportAssistant: (token: string, question: string) =>
    request<AiAssistantResponse>('/api/ai/support', { method: 'POST', body: JSON.stringify({ question }) }, token),
  createReview: (token: string, bookingId: string, rating: number, comment: string) =>
    request<Review>(`/api/reviews/bookings/${bookingId}`, { method: 'POST', body: JSON.stringify({ rating, comment }) }, token),
  reviewsByWorker: (workerId: string) => request<Review[]>(`/api/reviews/workers/${workerId}`),
  savedWorkers: (token: string) => request<SavedWorker[]>('/api/favorites/workers', {}, token),
  saveWorker: (token: string, workerId: string) => request<SavedWorker>(`/api/favorites/workers/${workerId}`, { method: 'POST' }, token),
  removeSavedWorker: (token: string, workerId: string) => request(`/api/favorites/workers/${workerId}`, { method: 'DELETE' }, token),
  registerDeviceToken: (token: string, payload: { platform: string; token: string }) => request('/api/notifications/device-tokens', { method: 'POST', body: JSON.stringify(payload) }, token),
  createCheckoutSession: (token: string, bookingId: string) => request(`/api/payments/bookings/${bookingId}/checkout-session`, { method: 'POST' }, token),
};