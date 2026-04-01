# FixCart Free Hosting Guide

FixCart is now prepared for a real hosted beta launch on free or near-free platforms.

## Recommended stack
- Backend: Render free web service or Koyeb free
- Database: Supabase Postgres free or Neon Postgres free
- Mobile beta: Expo Go / Expo free workflow
- Monitoring: Sentry free
- DNS later: Cloudflare free

## What is already prepared in code
- Backend supports `PORT`
- Backend exposes `/actuator/health`
- Backend accepts `JDBC_DATABASE_URL`, `DATABASE_URL`, or `SPRING_DATASOURCE_URL`
- Raw `postgres://` and `postgresql://` URLs are converted automatically to JDBC at startup
- CORS is environment-based with `CORS_ALLOWED_ORIGINS`
- Seed demo data can be toggled with `APP_SEED_ENABLED`
- Mobile reads `EXPO_PUBLIC_API_BASE_URL`
- Mobile keeps multilingual UI, map discovery, saved workers, rebooking, and worker directions
- Basic rate limiting and content moderation are enabled

## Demo accounts
- `customer@fixcart.app / Password@123`
- `worker@fixcart.app / Password@123`

## Backend env vars
Minimum required for hosted beta:
- `PORT=8080`
- `SPRING_PROFILES_ACTIVE=prod`
- `JWT_SECRET=use-a-long-random-secret`
- `CORS_ALLOWED_ORIGINS=*` for early beta, or your web/mobile origins later
- `APP_SEED_ENABLED=true` for demo accounts, `false` for cleaner production data

Database options:
- Option A: set only `DATABASE_URL` or `JDBC_DATABASE_URL`
- Option B: set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`

Supported examples:
- `DATABASE_URL=postgresql://user:password@host:5432/fixcart_platform?sslmode=require`
- `JDBC_DATABASE_URL=jdbc:postgresql://host:5432/fixcart_platform?sslmode=require`

Optional envs:
- `PAYMENT_PROVIDER=stub`
- `PAYMENT_CURRENCY=inr`
- `PAYMENT_SUCCESS_URL=https://example.com/payment-success`
- `PAYMENT_CANCEL_URL=https://example.com/payment-cancelled`
- `STRIPE_SECRET_KEY=`
- `EXPO_PUSH_ACCESS_TOKEN=`

## Mobile env vars
Create `fixcart-mobile/.env` from `.env.example` and set:
- `EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com`
- `EXPO_PUBLIC_ENABLE_DEV_PUSH_REGISTRATION=false`
- `EXPO_PUBLIC_SENTRY_DSN=` optionally later

## Render deployment steps
1. Push this repo to GitHub.
2. In Render, create a new Web Service from the repo.
3. Set root directory to `fixcart-backend` or use the provided `render.yaml`.
4. Choose Docker runtime.
5. Set env vars from the backend section above.
6. Use `/actuator/health` as the health check path.
7. Deploy and confirm the health endpoint returns `UP`.

## Supabase or Neon database steps
1. Create a free Postgres project.
2. Copy the connection string.
3. Prefer placing it in `DATABASE_URL` or `JDBC_DATABASE_URL`.
4. Keep SSL mode enabled if the provider requires it.
5. Deploy backend and let Flyway create the schema.

## Expo beta steps
1. In `fixcart-mobile`, create `.env` with the hosted backend URL.
2. Run `npm install` if needed.
3. Run `npm start` or `npx expo start --android`.
4. Open in Expo Go or an Android emulator.
5. Log in with the demo accounts.

## Suggested verification after hosting
- `GET /actuator/health`
- login with demo customer
- create booking request
- login as worker
- accept request
- send chat message
- submit review

## Honest free-tier limitations
- cold starts can be slow on free hosts
- background sync is more reliable than full mobile realtime sockets right now
- real payments, payouts, and push delivery still need external accounts/keys
- free tiers are suitable for beta and small pilots, not large-scale launch

## Recommendation
Use this as a real beta deployment for a small local user group first. After feedback, upgrade realtime, notifications, payments, and monitoring for a broader launch.
