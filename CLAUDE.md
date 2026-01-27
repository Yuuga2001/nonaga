# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NONAGA is a strategic hexagonal board game with three game modes:
- **Local game (vanilla)**: Single-file HTML application (`index.html`) using vanilla React via CDN — PvP and AI modes
- **Local game (Next.js)**: `/online/app/local/` route with `LocalGameClient.tsx` — PvP and AI modes within Next.js app
- **Online game**: Next.js 15 + React 19 application (`/online/`) with AWS AppSync for real-time multiplayer, room code matchmaking

Play URLs:
- Local: https://nonaga.riverapp.jp/
- Online lobby: https://nonaga.riverapp.jp/online/
- Local (Next.js): https://nonaga.riverapp.jp/online/local

**Matchmaking**: Online games generate a 6-digit room code for easy matchmaking without sharing full URLs

## Architecture

### Local Game (Vanilla: `index.html`, `app.jsx`, `app.css`)

Single-file HTML application transpiled via Babel CDN. No build tools required.
- AI opponent uses position evaluation scoring
- SVG-based board rendering

### Online Game (`/online/`)

Next.js 15 App Router with standalone output (`next.config.js: output: 'standalone'`):

```
online/
├── app/
│   ├── layout.tsx, page.tsx       # Root layout + Lobby page
│   ├── globals.css                # All styles + animations
│   ├── local/page.tsx             # Local game (AI/PvP) route
│   ├── about/page.tsx             # About page (Japanese)
│   ├── en/about/page.tsx          # About page (English)
│   ├── game/[gameId]/page.tsx     # Online game page
│   └── api/game/
│       ├── route.ts                       # POST: create game
│       ├── room/[roomCode]/route.ts       # GET: find game by room code
│       └── [gameId]/
│           ├── route.ts                   # GET/DELETE: game state
│           ├── join/route.ts              # POST: join game
│           ├── move/route.ts              # POST: move piece/tile
│           └── rematch/route.ts           # POST: request rematch
├── components/
│   ├── LobbyClient.tsx            # Game creation UI
│   ├── GameClient.tsx             # Online game logic (~700 lines)
│   ├── LocalGameClient.tsx        # Local game (AI/PvP) (~850 lines)
│   └── Board.tsx                  # SVG board rendering (online only)
├── lib/
│   ├── gameLogic.ts               # Shared game logic, types, i18n
│   └── graphql.ts                 # Server-side AppSync client
└── public/
    └── about/, en/about/          # Static HTML fallbacks (unused)
```

**Real-time sync**: Client-side 1-second polling via `GET /api/game/[gameId]`

**Server-side GraphQL**: API routes call AppSync via `lib/graphql.ts` using server-side env vars
- Queries: `getGame(gameId)`, `getGameByRoomCode(roomCode)`
- Mutations: `createGame`, `joinGame`, `movePiece`, `moveTile`, `abandonGame`, `rematchGame`

### LocalGameClient vs GameClient

| Feature | LocalGameClient.tsx | GameClient.tsx |
|---------|---------------------|----------------|
| Modes | AI + PvP | Online multiplayer |
| Board rendering | Inline SVG | Uses `Board.tsx` |
| State sync | Local React state | Polling + API |
| AI logic | Inline (position evaluation) | N/A |
| Language | `?lang=en` query param | Browser `document.documentElement.lang` |

### Infrastructure (`/infra/`)

AWS CDK (TypeScript) deploying:
- **AppSync**: GraphQL API with Lambda + DynamoDB resolvers
- **DynamoDB**: Game sessions with TTL (24h), GSIs:
  - `StatusIndex` (status + createdAt) — for listing waiting games
  - `RoomCodeIndex` (roomCode + createdAt) — for room code lookup
- **Lambda**: `gameHandler.ts` — validates moves, checks victory, ensures board connectivity

Stack names: `NonagaStack-Dev` / `NonagaStack-Prod`

### Core Data Structures

**Coordinate System**: Axial hex coordinates `{q, r}`, keyed as `"q,r"` via `coordsKey()`

**Game State**:
```typescript
gameId: string
roomCode?: string                       // 6-digit matchmaking code
tiles: Array<{q, r}>                    // 19 tile positions
pieces: Array<{id, player, q, r}>       // 6 pieces (3 red, 3 blue)
turn: 'red' | 'blue'
phase: 'waiting' | 'move_token' | 'move_tile' | 'ended'
status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'ABANDONED'
hostPlayerId: string
guestPlayerId?: string
```

### Critical Algorithms

In `online/lib/gameLogic.ts` (frontend) and `infra/lambda/gameHandler.ts` (backend):

1. **Slide Movement** (`getSlideDestinations`): Pieces slide in 6 hex directions until hitting piece or board edge
2. **Connectivity Check** (`isBoardConnected`): BFS ensures board stays connected after tile removal
3. **Victory Detection** (`getVictoryCoords`): 3 pieces with ≥2 adjacency pairs
4. **Valid Tile Destinations** (`getValidTileDestinations`): Must touch ≥2 existing tiles

## Development Commands

### Local Game (Vanilla)
```bash
npx serve .              # Serve at localhost:3000
python3 -m http.server   # Alternative: Serve at localhost:8000
```

### Online Frontend
```bash
cd online
npm install
npm run dev              # Dev server at localhost:3000
npm run build            # Production build (.next/)
```

### Infrastructure
```bash
cd infra
npm install
npx cdk bootstrap        # First-time setup: prepare AWS environment for CDK
npm run deploy:dev       # cdk deploy NonagaStack-Dev --require-approval never
npm run deploy:prod      # cdk deploy NonagaStack-Prod --require-approval never
npm run diff:dev         # cdk diff NonagaStack-Dev
npm run diff:prod        # cdk diff NonagaStack-Prod
npx cdk synth            # Generate CloudFormation template
```

### Environment Variables (Online)

Server-side env vars (set in `.env.production` or hosting environment):
```
APPSYNC_ENDPOINT=https://xxx.appsync-api.region.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxx
```

No `VITE_` prefix — these are Next.js server-side only (used in API routes).

## Deployment

### GitHub Actions (`.github/workflows/`)

- **`deploy-infra.yml`**: Triggered on `infra/**` changes to `main`. Deploys CDK stack via OIDC auth.
- **`deploy-frontend.yml`**: Triggered on `online/**` changes to `main`. Fetches AppSync credentials from CloudFormation outputs, builds Next.js.

### AWS Amplify Hosting

`amplify.yml` configures: `appRoot: online`, builds Next.js, artifacts from `.next/`.
Environment variables (`APPSYNC_ENDPOINT`, `APPSYNC_API_KEY`) must be set in Amplify Console.

## Common Pitfalls

1. **Coordinate key consistency**: Always use `coordsKey()` for Map/Set operations
2. **Animation blocking**: Never mutate game state during `isAnimating === true`
3. **Board connectivity**: Always validate tile moves with `isBoardConnected()` before allowing
4. **Duplicate game logic**: Move validation exists in both `infra/lambda/gameHandler.ts` (authoritative) and `online/lib/gameLogic.ts` (UI feedback) — keep in sync
5. **Polling vs subscriptions**: Client uses polling; AppSync subscriptions exist in schema but are not used
6. **Player ID**: UUID stored in localStorage; clearing it creates a new player identity
7. **Move retry**: `GameClient.tsx` retries failed moves up to 3 times with 500ms delay
8. **useSearchParams requires Suspense**: `LocalGameClient.tsx` uses `useSearchParams()` which requires wrapping in `<Suspense>` in the page component
9. **LocalGameClient renders its own SVG**: Unlike GameClient which uses Board.tsx, LocalGameClient renders the board inline (faithful port of app.jsx)
10. **Room code validation**: Room codes are 6 digits; client validates format and strips non-numeric characters before API calls
