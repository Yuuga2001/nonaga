# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NONAGA is a strategic hexagonal board game with three game modes:
- **Local modes**: Single-file HTML application (`index.html`) using vanilla React via CDN
  - Player vs Player (PvP) on the same device
  - AI opponent mode
- **Online mode**: Vite + React + TypeScript application (`/online/`) with AWS AppSync for real-time multiplayer

Game features:
- 19 hexagonal tiles arranged in a honeycomb pattern
- 6 pieces (3 red, 3 blue) that slide across the board
- Two-phase turns: piece movement → tile relocation
- Victory condition: connect all 3 pieces adjacently
- Japanese/English language support

## Architecture

### Directory Structure

```
nonaga/
├── index.html, app.jsx, app.css  # Local game (vanilla React via CDN)
├── online/                        # Online multiplayer (Vite + React + TypeScript)
│   ├── src/
│   │   ├── components/           # React components (Board, Lobby, OnlineGame)
│   │   ├── hooks/useOnlineGame.ts # AppSync real-time hook
│   │   ├── lib/gameLogic.ts      # Shared game logic & i18n
│   │   └── graphql/operations.ts # GraphQL queries/mutations/subscriptions
│   └── vite.config.ts            # base: '/online/'
├── infra/                         # AWS CDK infrastructure
│   ├── lib/nonaga-stack.ts       # AppSync + DynamoDB + Lambda
│   ├── lambda/gameHandler.ts     # Game logic Lambda
│   └── graphql/schema.graphql    # GraphQL schema
├── amplify.yml                    # AWS Amplify build configuration
├── about/, en/                    # Static content pages
└── public/                        # Static assets
```

### Local Game (`index.html`)

Single-file HTML application with inline CSS and React components transpiled via Babel CDN.
- No build tools required
- Game state managed via React hooks
- AI opponent uses position evaluation scoring

### Online Game (`/online/`)

Vite + React + TypeScript SPA with real-time multiplayer:
- **AppSync GraphQL API**: Queries, Mutations, Subscriptions for game state sync
- **DynamoDB**: Game session storage with TTL (24h auto-deletion)
- **Lambda**: Game logic validation (move validation, victory detection)
- **Player ID**: UUID stored in localStorage for anonymous play

### Core Data Structures

**Coordinate System**: Axial coordinates `{q, r}` for hexagonal grid
- Keys as strings: `"q,r"` via `coordsKey()`

**State Management**:
```typescript
tiles: Array<{q, r}>           // 19 tile positions
pieces: Array<{id, player, q, r}>  // 6 piece positions
turn: 'red' | 'blue'
phase: 'move_token' | 'move_tile' | 'ended'
winner: 'red' | 'blue' | null
```

### Critical Algorithms

Located in `online/src/lib/gameLogic.ts` (shared) and `app.jsx` (local):

1. **Slide Movement** (`getSlideDestinations`): Pieces slide in 6 hex directions until hitting another piece or board edge
2. **Connectivity Check** (`isBoardConnected`): BFS ensures board remains connected after tile removal
3. **Victory Detection** (`getVictoryCoords`): Checks if 3 pieces of a player are pairwise adjacent (≥2 adjacency pairs)
4. **Valid Tile Destinations** (`getValidTileDestinations`): Destination must touch ≥2 existing tiles

## Development Commands

### Local Game (no build required)
```bash
# Serve locally
python -m http.server 8000
# or
npx serve .
```

### Online Frontend
```bash
cd online
npm install
npm run dev      # Development server (localhost:5173)
npm run build    # Production build to dist/
npm run lint     # ESLint
```

### Infrastructure (AWS CDK)
```bash
cd infra
npm install
npx cdk synth    # Generate CloudFormation
npx cdk deploy   # Deploy to AWS
npx cdk diff     # Show changes
```

### Environment Variables

Online frontend requires `.env` file (copy from `.env.example`):
```
VITE_APPSYNC_ENDPOINT=https://xxx.appsync-api.region.amazonaws.com/graphql
VITE_APPSYNC_API_KEY=da2-xxx
VITE_APPSYNC_REGION=ap-northeast-1
```

## Deployment

### AWS Amplify Hosting

- `amplify.yml` configures build: installs deps, builds online frontend, replaces source with dist
- Rewrites: `/online/<*>` → `/online/index.html` for SPA routing
- **Important**: Amplify Console rewrite settings override YAML; ensure assets (`.js`, `.css`) are not rewritten

### CDK Infrastructure

Deploy AppSync API, DynamoDB table, and Lambda:
```bash
cd infra && npx cdk deploy NonagaStack-Prod
```
Outputs API URL and API Key for frontend configuration.

## Common Pitfalls

1. **Coordinate key consistency**: Always use `coordsKey()` for Map/Set operations
2. **Phase-dependent selection**: Check `typeof selectedId` to distinguish piece vs tile selection
3. **Animation blocking**: Never mutate game state during `isAnimating === true`
4. **Board connectivity**: Always validate tile moves with `isBoardConnected()` before allowing
5. **Amplify rewrites**: Overly broad rewrite rules (e.g., `/online/<*>`) can intercept asset requests, causing MIME type errors
6. **Online player ID**: Stored in localStorage; clearing it creates a new player identity

## Game Rules

**Turn sequence**:
1. Select your piece → click destination (slides to edge)
2. Select empty tile → click new position (must touch ≥2 tiles, keep board connected)

**Win condition**: Your 3 pieces form any connected shape (line, triangle, or V-shape)
