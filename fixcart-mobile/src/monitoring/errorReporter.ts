declare const process: { env: Record<string, string | undefined> };

import * as Sentry from '@sentry/react-native';

let initialized = false;

function dsn() {
  return process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
}

export function initializeErrorReporting() {
  if (initialized) {
    return;
  }

  initialized = true;
  const sentryDsn = dsn();
  if (!sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_SENTRY === 'true',
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
    attachStacktrace: true,
    tracesSampleRate: __DEV__ ? 0 : 0.1,
  });
}

export function reportError(error: unknown, context?: string) {
  if (__DEV__) {
    console.error('FixCart error', context ?? 'unknown', error);
  }

  if (!dsn()) {
    return;
  }

  const exception = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  Sentry.withScope((scope) => {
    if (context) {
      scope.setTag('context', context);
    }
    Sentry.captureException(exception);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!dsn()) {
    if (__DEV__) {
      console.log('FixCart message', level, message);
    }
    return;
  }

  Sentry.captureMessage(message, level);
}

export function withErrorBoundary<T>(component: T): T {
  return dsn() ? Sentry.wrap(component as never) as T : component;
}
