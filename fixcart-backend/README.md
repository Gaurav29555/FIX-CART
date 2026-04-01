# FixCart Backend

Unified Spring Boot backend for the FixCart MVP.

## What is included
- JWT auth with refresh tokens
- customer and worker roles
- worker profile and availability management
- service categories
- booking broadcast and acceptance flow
- booking status lifecycle
- persisted booking chat
- worker reviews after completion
- deterministic worker ranking
- saved workers and rebooking support
- booking commission and worker payout fields
- basic abuse filtering for chat and reviews
- lightweight in-memory rate limiting for auth, chat, and reviews
- Swagger UI
- `/actuator/health` health check
- PostgreSQL default profile
- local H2 fallback profile

## Demo accounts
- customer@fixcart.app / Password@123
- worker@fixcart.app / Password@123

## Run with local H2
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

## Run with PostgreSQL
1. Copy `.env.example` values into your environment.
2. Set either `JDBC_DATABASE_URL` or `DB_HOST`/`DB_PORT`/`DB_NAME`.
3. Run:
```bash
mvn spring-boot:run
```

## Docker deploy
```bash
docker build -t fixcart-backend .
docker run -p 8080:8080 --env-file .env fixcart-backend
```

## Health and docs
- Health: `http://localhost:8080/actuator/health`
- Swagger: `http://localhost:8080/swagger-ui.html`

## Main APIs
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- GET `/api/auth/me`
- GET `/api/categories`
- GET `/api/workers/discover`
- PATCH `/api/workers/me`
- POST `/api/bookings`
- GET `/api/bookings`
- GET `/api/bookings/open`
- PATCH `/api/bookings/{bookingId}/accept`
- PATCH `/api/bookings/{bookingId}/status`
- GET `/api/chat/bookings/{bookingId}`
- POST `/api/chat/bookings/{bookingId}/messages`
- POST `/api/reviews/bookings/{bookingId}`
- GET `/api/reviews/workers/{workerId}`
- GET `/api/favorites/workers`
- POST `/api/favorites/workers/{workerId}`
- DELETE `/api/favorites/workers/{workerId}`

## Notes
- The rate limit is in-memory and suitable for small free-tier deployments, not horizontal scaling.
- Free-tier hosting is good for beta launch, not full production scale.
