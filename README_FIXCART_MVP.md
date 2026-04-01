# FixCart MVP Workspace

## New deliverables
- `fixcart-backend`: unified Spring Boot marketplace backend
- `fixcart-mobile`: Expo React Native client

## Recommended run order
1. Start the backend
2. Start the mobile app
3. Log in with demo customer and worker accounts
4. Create a booking as customer
5. Accept and update it as worker
6. Use chat and leave a review after completion

## Quick backend start
```bash
cd fixcart-backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

## Quick mobile start
```bash
cd fixcart-mobile
npm start
```

## Current limitations
- Worker discovery is list-based in this pass; map rendering is not implemented yet.
- Realtime messaging uses persisted chat endpoints and backend WebSocket support, but the mobile app currently uses refresh-based chat rather than a live socket client.
- AI provider integration hooks are not implemented yet in this pass.
- Notifications and monetization hooks are not yet wired into the app.
