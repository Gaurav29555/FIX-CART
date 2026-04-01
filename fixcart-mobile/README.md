# FixCart Mobile

Expo React Native client for the FixCart MVP.

## What is included
- multilingual login and dashboards
- role-based customer and worker flows
- nearby worker map discovery
- booking creation and worker acceptance
- booking chat with background sync
- review submission after completion
- saved workers and rebooking
- worker directions to customer
- optional Expo push token registration
- optional Sentry crash reporting
- EAS preview and production Android build profiles

## Install
```bash
npm install
```

## Local run
```bash
npm start
```

## Android shortcut
```bash
npx expo start --android
```

## Environment
Create `.env` from `.env.example`.

Typical local emulator value:
- `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080`

Typical hosted beta value:
- `EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com`

Push and monitoring:
- `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true`
- `EXPO_PUBLIC_EXPO_PROJECT_ID=` set this after `eas init`
- `EXPO_PUBLIC_SENTRY_DSN=` optional Sentry DSN
- `EXPO_PUBLIC_ENABLE_DEV_SENTRY=false`
- `EXPO_PUBLIC_APP_ENV=development`
- `EXPO_PUBLIC_ENABLE_DEV_PUSH_REGISTRATION=false` keeps the old fake-token fallback available when needed

## Push notifications
- Expo Go is fine for most beta testing, but real push delivery is best verified with an EAS development build or preview build.
- Backend delivery can stay on `PUSH_PROVIDER=log` until you are ready.
- To send real Expo pushes from the backend, set `PUSH_PROVIDER=expo` and optionally `EXPO_PUSH_ACCESS_TOKEN` on the backend host.

## Crash reporting
- Create a Sentry React Native project.
- Put the DSN into `EXPO_PUBLIC_SENTRY_DSN`.
- For local debugging, turn on `EXPO_PUBLIC_ENABLE_DEV_SENTRY=true` only if you want local events.

## Android release builds
Preview APK:
```bash
npx eas build --platform android --profile preview
```

Production AAB:
```bash
npx eas build --platform android --profile production
```

Before the first EAS build:
```bash
npx eas login
npx eas init
```

## Demo accounts
- `customer@fixcart.app / Password@123`
- `worker@fixcart.app / Password@123`

## Beta verification
1. Log in as customer
2. Create a booking request
3. Log in as worker
4. Accept the booking
5. Send a chat message
6. Complete the booking and submit a review

## Notes
- Expo Go is still the fastest way to validate the hosted beta.
- For a physical Android device, use the hosted backend URL in `.env`.
- For an emulator, local loopback `10.0.2.2` still works.
- Real push delivery and store-ready release signing still require your Expo account setup.
