import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { clearPushRegistrationCache, syncPushRegistration } from '../notifications/syncPushRegistration';
import { AuthResponse, UserSummary } from '../types';

const ACCESS_TOKEN_KEY = 'fixcart_access_token';
const REFRESH_TOKEN_KEY = 'fixcart_refresh_token';
const USER_KEY = 'fixcart_user';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSummary | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    set({
      accessToken,
      refreshToken,
      user: userJson ? (JSON.parse(userJson) as UserSummary) : null,
      hydrated: true,
    });
  },
  signIn: async (auth) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, auth.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, auth.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(auth.user)),
    ]);
    set({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user });
    await syncPushRegistration(auth.accessToken, auth.user.id);
  },
  signOut: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
  },
}));

