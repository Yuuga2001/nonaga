# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NONAGA is a strategic hexagonal board game with two main components:
- **Local game**: Single-file HTML application (`index.html`) using vanilla React via CDN — PvP and AI modes
- **Online game**: Next.js 15 + React 19 application (`/online/`) with AWS AppSync for real-time multiplayer

## Architecture

### Local Game (`index.html`, `app.jsx`, `app.css`)

Single-file HTML application transpiled via Babel CDN. No build tools required.
- Game state managed via React hooks
- AI opponent uses position evaluation scoring
- SVG-based board rendering

### Online Game (`/online/`)

Next.js 15 App Router with standalone output (`next.config.js: output: 'standalone'`):

```
online/
├── app/
│   ├── layout.tsx, page.tsx       # Root layout + Lobby page
│   ├── globals.css                # All styles + animations
│   ├── game/[gameId]/page.tsx     # Game page (dynamic route)
│   └── api/                       # Next.js Route Handlers
│       ├── health/route.ts
│       └── game/
│           ├── route.ts                    # POST: create game
│           └── [gameId]/
│               ├── route.ts                # GET/DELETE: game state
│               ├── join/route.ts           # POST: join game
│               └── move/route.ts           # POST: move piece/tile
├── components/
│   ├── LobbyClient.tsx            # Game creation UI
│   ├── GameClient.tsx             # Main game logic (615 lines)
│   └── Board.tsx                  # SVG board rendering
├── lib/
│   ├── gameLogic.ts               # Shared game logic, types, i18n
│   └── graphql.ts                 # Server-side AppSync client
└── next.config.js                 # output: 'standalone'
```

**Real-time sync**: Client-side 1-second polling (not WebSocket subscriptions) via `GET /api/game/[gameId]`

**Server-side GraphQL**: API routes call AppSync via `lib/graphql.ts` using server-side env vars (`APPSYNC_ENDPOINT`, `APPSYNC_API_KEY`)

### Infrastructure (`/infra/`)

AWS CDK (TypeScript) deploying:
- **AppSync**: GraphQL API with Lambda + DynamoDB resolvers
- **DynamoDB**: Game sessions with TTL (24h auto-deletion), GSI on status+createdAt
- **Lambda**: `gameHandler.ts` — Node.js 20, validates moves, checks victory, ensures board connectivity

Stack names: `NonagaStack-Dev` / `NonagaStack-Prod`

### Core Data Structures

**Coordinate System**: Axial hex coordinates `{q, r}`, keyed as `"q,r"` via `coordsKey()`

**Game State**:
```typescript
tiles: Array<{q, r}>                    // 19 tile positions
pieces: Array<{id, player, q, r}>       // 6 pieces (3 red, 3 blue)
turn: 'red' | 'blue'
phase: 'waiting' | 'move_token' | 'move_tile' | 'ended'
status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'ABANDONED'
```

### Critical Algorithms

In `online/lib/gameLogic.ts` (frontend) and `infra/lambda/gameHandler.ts` (backend):

1. **Slide Movement** (`getSlideDestinations`): Pieces slide in 6 hex directions until hitting piece or board edge
2. **Connectivity Check** (`isBoardConnected`): BFS ensures board stays connected after tile removal
3. **Victory Detection** (`getVictoryCoords`): 3 pieces with ≥2 adjacency pairs
4. **Valid Tile Destinations** (`getValidTileDestinations`): Must touch ≥2 existing tiles

## Development Commands

### Local Game
```bash
npx serve .              # Serve at localhost:3000
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
npm run deploy:dev       # cdk deploy NonagaStack-Dev --require-approval never
npm run deploy:prod      # cdk deploy NonagaStack-Prod --require-approval never
npm run diff:dev         # cdk diff NonagaStack-Dev
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
5. **Polling vs subscriptions**: Client uses polling; AppSync subscriptions exist in schema but are not used by the Next.js frontend
6. **Player ID**: UUID stored in localStorage; clearing it creates a new player identity
7. **Move retry**: `GameClient.tsx` retries failed moves up to 3 times with 500ms delay
