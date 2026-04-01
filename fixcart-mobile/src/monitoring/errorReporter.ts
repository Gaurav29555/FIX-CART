export function reportError(error: unknown, context?: string) {
  if (__DEV__) {
    console.error('FixCart error', context ?? 'unknown', error);
  }
}
