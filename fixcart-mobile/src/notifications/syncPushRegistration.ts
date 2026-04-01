declare const process: { env: Record<string, string | undefined> };

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { reportError } from '../monitoring/errorReporter';

const DEVICE_PUSH_TOKEN_KEY = 'fixcart_device_push_token';
const DEV_PUSH_FLAG = 'EXPO_PUBLIC_ENABLE_DEV_PUSH_REGISTRATION';
const PUSH_FLAG = 'EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS';

let notificationsConfigured = false;

function pushEnabled() {
  return process.env[PUSH_FLAG] !== 'false';
}

function getProjectId() {
  return process.env.EXPO_PUBLIC_EXPO_PROJECT_ID
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? (Constants as typeof Constants & { easConfig?: { projectId?: string } }).easConfig?.projectId
    ?? null;
}

export function configureNotifications() {
  if (notificationsConfigured) return;
  notificationsConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

async function registerForExpoPushTokenAsync() {
  if (!pushEnabled() || Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    return null;
  }

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function getOrCreateToken(userId: string) {
  let token = await SecureStore.getItemAsync(DEVICE_PUSH_TOKEN_KEY);
  if (token) {
    return token;
  }

  try {
    token = await registerForExpoPushTokenAsync();
  } catch (error) {
    reportError(error, 'push-registration');
  }

  if (!token && process.env[DEV_PUSH_FLAG] === 'true') {
    token = `fixcart-dev-${userId}`;
  }

  if (token) {
    await SecureStore.setItemAsync(DEVICE_PUSH_TOKEN_KEY, token);
  }

  return token;
}

export async function syncPushRegistration(accessToken: string | null, userId?: string | null) {
  if (!accessToken || !userId) {
    return;
  }

  const token = await getOrCreateToken(userId);
  if (!token) {
    return;
  }

  try {
    await api.registerDeviceToken(accessToken, {
      platform: token.startsWith('ExponentPushToken[') ? 'expo' : 'expo-dev',
      token,
    });
  } catch (error) {
    reportError(error, 'push-token-sync');
  }
}

export async function clearPushRegistrationCache() {
  await SecureStore.deleteItemAsync(DEVICE_PUSH_TOKEN_KEY);
}

export const syncDevelopmentPushRegistration = syncPushRegistration;

