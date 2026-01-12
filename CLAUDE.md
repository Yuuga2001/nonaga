# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NONAGA is a strategic hexagonal board game implemented as a **single-file HTML application** using vanilla React (loaded via CDN). The game features:
- 19 hexagonal tiles arranged in a honeycomb pattern
- 6 pieces (3 red, 3 blue) that slide across the board
- Two-phase turns: piece movement → tile relocation
- Victory condition: connect all 3 pieces adjacently
- Two game modes: Player vs Player (PvP) and AI opponent
- Japanese language UI with comprehensive SEO optimization

## Architecture

### Single-File Structure

The entire game is contained in [index.html](index.html) with four main sections:
1. **SEO Metadata (lines 1-131)**: Comprehensive meta tags, JSON-LD structured data for search engines
2. **CSS (lines 135-262)**: Styling with responsive design and animations
3. **React Components (lines 269-950)**: Game logic, AI opponent, and rendering
4. **Inline JSX via Babel**: Transpiled in-browser

This is NOT a traditional React project with build tools—all dependencies load from CDN.

### Core Data Structures

**Coordinate System**: Axial coordinates `{q, r}` for hexagonal grid
- Stored as objects: `{q: number, r: number}`
- Keys generated as strings: `"q,r"` via `coordsKey()`

**State Management** (React useState hooks):
```javascript
tiles: Array<{q, r}>          // 19 tile positions
pieces: Array<{id, player, q, r}>  // 6 piece positions
turn: 'red' | 'blue'
phase: 'move_token' | 'move_tile' | 'ended'
selectedId: string | number | null  // piece ID or tile index
winner: 'red' | 'blue' | null
victoryLine: string[]          // coordsKey array
isAnimating: boolean           // blocks input during animations
animatingPiece: {id, x, y} | null  // piece animation state
animatingTile: {index, x, y} | null // tile animation state
gameMode: 'pvp' | 'ai'        // game mode selection
aiPlayer: 'red' | 'blue' | null    // which color AI controls
aiThinking: boolean            // AI computation in progress
isShuffling: boolean           // shuffle animation for first-player selection
```

**Derived State** (useMemo):
- `tileMap`: Set of tile coordinate keys for O(1) lookup
- `pieceMap`: Map of coordinate keys to pieces
- `viewBounds`: SVG viewBox calculations
- `validDests`: Legal moves based on current phase/selection

### Critical Algorithms

#### 1. Slide Movement (lines 471-480)
Pieces slide in one of 6 hex directions until hitting:
- Another piece
- Board edge (missing tile)

Implementation walks the direction vector until no valid tile or piece collision.

#### 2. Connectivity Check (lines 482-492)
When selecting a tile to move in phase 2:
- Temporarily remove tile from board
- BFS from any remaining tile
- Ensure all N-1 tiles are reachable
- **Critical**: Prevents board fragmentation

#### 3. Victory Detection (lines 405-411)
Checks if all 3 pieces of a player are pairwise adjacent:
- At least 2 of 3 possible adjacency pairs must be true
- Uses `DIRECTIONS` array to check 6-directional neighbors

#### 4. Piece Animation (lines 413-433)
Custom easing-based animation using `requestAnimationFrame`:
- 800ms cubic ease-out
- Interpolates hex-to-pixel coordinates
- Blocks further input during animation with `isAnimating` flag

#### 5. AI Opponent (lines 496-769)
Sophisticated AI using position evaluation:
- **Phase 1 (Move Token)**: Evaluates all possible piece moves with scoring:
  - Immediate win: 10000 points
  - Adjacent pairs formation: 500 points per pair
  - Minimum distance between pieces: penalty of 30 per unit
  - Compactness (distance to center of mass): penalty of 20 per unit
  - Enemy adjacent pairs: penalty of 200 per pair (defensive)
  - Distance to board center: slight penalty of 5 per unit
- **Phase 2 (Move Tile)**: Evaluates all valid tile movements:
  - Blocking enemy victory: 15000 points (highest priority)
  - Moving enemy piece tiles to disrupt formations: distance-based scoring
  - Moving own piece tiles closer to allies
  - Connectivity validation (prevents board fragmentation)
- 800ms artificial delay for natural feel
- Blocks user input during AI thinking with `aiThinking` flag

### Coordinate System Details

**Hexagon Layout**: Pointy-top orientation
- Hex size: 38 units
- Pixel conversion formula (line 392):
  ```javascript
  x = HEX_SIZE * (3/2 * q)
  y = HEX_SIZE * (√3/2 * q + √3 * r)
  ```

**Directional Vectors** (line 272):
```javascript
[{q:1,r:0}, {q:1,r:-1}, {q:0,r:-1},
 {q:-1,r:0}, {q:-1,r:1}, {q:0,r:1}]
```

### Initial State

**Tile Layout**: 19 tiles in hexagon shape with 2-tile radius (line 274)

**Piece Positions** (lines 276-283):
- Red: `(2,-2)`, `(0,2)`, `(-2,0)`
- Blue: `(2,0)`, `(-2,2)`, `(0,-2)`
- Arranged at alternating vertices of the outer hexagon

### Game Modes

**PvP Mode**: Two human players take turns on the same device

**AI Mode** (lines 320-789):
- Random first-player selection with shuffle animation (1.2s)
- AI automatically plays when it's its turn
- Evaluation-based move selection (not minimax for performance)
- Natural delays between moves for better UX

## Development Commands

**No build system required**. To develop:

```bash
# Serve locally (any HTTP server works)
python -m http.server 8000
# or
npx serve .

# Open browser to localhost:8000
```

**Testing**: Manual browser testing only (no test framework)

**Linting**: No linter configured (vanilla JavaScript in script tag)

## Key Implementation Details

### Phase Management
- Turn structure enforces strict ordering: move piece → move tile → next player
- Phase transitions happen in two places:
  - After piece animation completes (line 429)
  - After tile placement (lines 449-461, with AI-specific delay)

### Selection Behavior
- `selectedId` is overloaded:
  - String (piece ID) during `move_token` phase
  - Number (tile index) during `move_tile` phase
- Click handling differs by phase:
  - `handlePieceClick` (line 466)
  - `handleTileClick` (lines 467-494)

### Mobile Optimization
- Uses `100dvh` for dynamic viewport height (line 143)
- `touch-action: none` on board to prevent scroll conflicts (line 204)
- Safe area insets for iOS notch (lines 164, 250)
- Viewport meta tag with zoom settings (line 5)

### Animation Constraints
- `isAnimating` flag prevents race conditions during both piece and tile animations
- `animationFrameRef` cleaned up in animation completion callbacks
- Victory check happens AFTER piece animation completes (line 428)
- AI turn waits for animations to complete before making next move (line 786)

### Tile Movement Validation
Two-step validation for tile moves:
1. **Connectivity**: BFS ensures board remains connected (lines 482-491)
2. **Adjacency count**: Destination must touch ≥2 tiles (computed in `validDests` at lines 806-813)

Both checks prevent invalid game states.

### SEO Implementation
Comprehensive SEO optimization for search engines:
- **Meta tags**: Open Graph, Twitter Card, language/geo tags (lines 7-49)
- **JSON-LD structured data**: VideoGame schema with ratings, Game schema (lines 52-131)
- **Hidden semantic content**: Accessible descriptions for crawlers (lines 926-947)
- **Accessibility**: Skip links, ARIA labels, semantic HTML (lines 266, 819-864)

## Common Pitfalls

1. **Coordinate key consistency**: Always use `coordsKey()` for Map/Set operations
2. **Phase-dependent selection**: Check `typeof selectedId` to distinguish piece vs tile selection
3. **Animation blocking**: Never mutate game state during `isAnimating === true` or `aiThinking === true`
4. **Tile index stability**: Tile array indices change when tiles move—don't cache indices
5. **BFS starting point**: Always start from `temp[0]` (any remaining tile) in connectivity check
6. **AI mode checks**: Check `gameMode === 'ai' && turn === aiPlayer` before allowing user input
7. **Shuffle animation**: Check `isShuffling` flag during game start in AI mode
8. **Timeout cleanup**: Always clear `shuffleTimeoutRef` in cleanup functions to prevent memory leaks

## Extending the Game

**To add features**:
- **Undo**: Implement state history stack (capture tiles/pieces/turn/phase snapshots)
- **Improved AI**: Minimax with alpha-beta pruning (current AI uses evaluation only)
- **Difficulty levels**: Adjust AI scoring weights for easy/medium/hard
- **Online multiplayer**: Extract state to JSON, sync via WebSocket
- **Mobile app**: Wrap in React Native WebView or rebuild with native hex rendering
- **Move hints**: Show suggested moves for beginners
- **Game replay**: Record and playback games from move history

**Architecture migration path**:
If converting to a proper React app:
1. Extract game logic to custom hooks (`useGameState.js`, `useAI.js`)
2. Separate components: `Board.jsx`, `Piece.jsx`, `Tile.jsx`, `StatusBar.jsx`, `ShuffleAnimation.jsx`, `Confetti.jsx`
3. Move constants to `constants.js` (DIRECTIONS, HEX_SIZE, INITIAL_TILES, INITIAL_PIECES)
4. Extract AI logic to separate module (`ai.js` or `aiEngine.js`)
5. Add Vite/Next.js build system
6. Replace CDN React with npm packages

## Game Rules Summary

**Turn sequence**:
1. Select your piece → click destination (slides to edge)
2. Select empty tile → click new position (must touch ≥2 tiles, keep board connected)

**Win condition**: Your 3 pieces form any connected shape (line, triangle, or V-shape)

**Edge cases**:
- Cannot move tile if it would split the board
- Cannot skip tile movement phase
- Pieces can't slide to current position (no valid destination)
