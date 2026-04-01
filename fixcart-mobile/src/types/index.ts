export type UserRole = 'CUSTOMER' | 'WORKER' | 'ADMIN';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
}

export interface WorkerSnapshot {
  workerId: string;
  bio: string | null;
  experienceYears: number | null;
  basePrice: number | null;
  hourlyRate: number | null;
  rating: number | null;
  totalReviews: number | null;
  available: boolean | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: UserSummary;
}

export interface MeResponse {
  user: UserSummary;
  workerProfile?: WorkerSnapshot | null;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  icon: string;
}

export interface WorkerCard {
  workerId: string;
  userId: string;
  name: string;
  category: string;
  bio: string;
  experienceYears: number;
  basePrice: number;
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
  serviceRadiusKm?: number | null;
  available: boolean;
  recommendationScore?: number | null;
  recommendationExplanation?: string | null;
}

export type BookingStatus =
  | 'REQUESTED'
  | 'BROADCASTED'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface StatusHistoryItem {
  id: string;
  status: BookingStatus;
  updatedBy: string;
  note?: string | null;
  createdAt: string;
}

export interface Booking {
  bookingId: string;
  customerId: string;
  workerId?: string | null;
  customerName: string;
  workerName?: string | null;
  category: string;
  title: string;
  description: string;
  budget: number;
  platformFee?: number | null;
  workerPayout?: number | null;
  expectedDurationHours: number;
  preferredTime: string;
  address: string;
  latitude: number;
  longitude: number;
  urgency: string;
  status: BookingStatus;
  matchExplanation?: string | null;
  history: StatusHistoryItem[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  sentAt: string;
}

export interface ChatRoom {
  roomId: string;
  bookingId: string;
  messages: ChatMessage[];
}

export interface SavedWorker {
  id: string;
  workerId: string;
  customerId: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}




