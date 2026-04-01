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

Optional:
- `EXPO_PUBLIC_ENABLE_DEV_PUSH_REGISTRATION=false`
- `EXPO_PUBLIC_SENTRY_DSN=`

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
- Expo Go is the fastest way to validate the hosted beta.
- For a physical Android device, use the hosted backend URL in `.env`.
- For an emulator, local loopback `10.0.2.2` still works.
