declare const process: { env: Record<string, string | undefined> };

import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

const DEVICE_PUSH_TOKEN_KEY = 'fixcart_device_push_token';

export async function syncDevelopmentPushRegistration(accessToken: string | null, userId?: string | null) {
  if (!accessToken || !userId) {
    return;
  }

  const enabled = process.env.EXPO_PUBLIC_ENABLE_DEV_PUSH_REGISTRATION === 'true';
  if (!enabled) {
    return;
  }

  let token = await SecureStore.getItemAsync(DEVICE_PUSH_TOKEN_KEY);
  if (!token) {
    token = `fixcart-dev-${userId}`;
    await SecureStore.setItemAsync(DEVICE_PUSH_TOKEN_KEY, token);
  }

  try {
    await api.registerDeviceToken(accessToken, {
      platform: 'expo-dev',
      token,
    });
  } catch {
    // Keep login resilient even if notification registration fails.
  }
}
