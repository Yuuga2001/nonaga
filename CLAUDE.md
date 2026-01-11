# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NONAGA is a two-player strategic hexagonal board game implemented as a **single-file HTML application** using vanilla React (loaded via CDN). The game features:
- 19 hexagonal tiles arranged in a honeycomb pattern
- 6 pieces (3 red, 3 blue) that slide across the board
- Two-phase turns: piece movement → tile relocation
- Victory condition: connect all 3 pieces adjacently

## Architecture

### Single-File Structure

The entire game is contained in [index.html](index.html) with three main sections:
1. **CSS (lines 10-99)**: Styling with responsive design and animations
2. **React Components (lines 103-325)**: Game logic and rendering
3. **Inline JSX via Babel**: Transpiled in-browser

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
```

**Derived State** (useMemo):
- `tileMap`: Set of tile coordinate keys for O(1) lookup
- `pieceMap`: Map of coordinate keys to pieces
- `viewBounds`: SVG viewBox calculations
- `validDests`: Legal moves based on current phase/selection

### Critical Algorithms

#### 1. Slide Movement (lines 187-195)
Pieces slide in one of 6 hex directions until hitting:
- Another piece
- Board edge (missing tile)

Implementation walks the direction vector until no valid tile or piece collision.

#### 2. Connectivity Check (lines 198-207)
When selecting a tile to move in phase 2:
- Temporarily remove tile from board
- BFS from any remaining tile
- Ensure all N-1 tiles are reachable
- **Critical**: Prevents board fragmentation

#### 3. Victory Detection (lines 152-158)
Checks if all 3 pieces of a player are pairwise adjacent:
- At least 2 of 3 possible adjacency pairs must be true
- Uses `DIRECTIONS` array to check 6-directional neighbors

#### 4. Piece Animation (lines 160-180)
Custom easing-based animation using `requestAnimationFrame`:
- 450ms cubic ease-out
- Interpolates hex-to-pixel coordinates
- Blocks further input during animation with `isAnimating` flag

### Coordinate System Details

**Hexagon Layout**: Pointy-top orientation
- Hex size: 38 units
- Pixel conversion formula (lines 139):
  ```javascript
  x = HEX_SIZE * (3/2 * q)
  y = HEX_SIZE * (√3/2 * q + √3 * r)
  ```

**Directional Vectors** (line 106):
```javascript
[{q:1,r:0}, {q:1,r:-1}, {q:0,r:-1},
 {q:-1,r:0}, {q:-1,r:1}, {q:0,r:1}]
```

### Initial State

**Tile Layout**: 19 tiles in hexagon shape with 2-tile radius (line 108)

**Piece Positions** (lines 110-117):
- Red: `(2,-2)`, `(0,2)`, `(-2,0)`
- Blue: `(2,0)`, `(-2,2)`, `(0,-2)`
- Arranged at alternating vertices of the outer hexagon

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
  - After piece animation completes (line 176)
  - After tile placement (line 286)

### Selection Behavior
- `selectedId` is overloaded:
  - String (piece ID) during `move_token` phase
  - Number (tile index) during `move_tile` phase
- Click handling differs by phase in `handleTileClick` (lines 183-209)

### Mobile Optimization
- Uses `100dvh` for dynamic viewport height (line 18)
- `touch-action: none` on board to prevent scroll conflicts (line 62)
- Safe area insets for iOS notch (line 88)
- Viewport meta tag disables zoom (line 5)

### Animation Constraints
- `isAnimating` flag prevents race conditions
- `animationFrameRef` cleaned up on unmount (line 179)
- Victory check happens AFTER animation completes (line 174)

### Tile Movement Validation
Two-step validation for tile moves:
1. **Connectivity**: BFS ensures board remains connected (lines 200-206)
2. **Adjacency count**: Destination must touch ≥2 tiles (lines 227-235)

Both checks prevent invalid game states.

## Common Pitfalls

1. **Coordinate key consistency**: Always use `coordsKey()` for Map/Set operations
2. **Phase-dependent selection**: Check `typeof selectedId` to distinguish piece vs tile selection
3. **Animation blocking**: Never mutate game state during `isAnimating === true`
4. **Tile index stability**: Tile array indices change when tiles move—don't cache indices
5. **BFS starting point**: Always start from `temp[0]` (any remaining tile) in connectivity check

## Extending the Game

**To add features**:
- **Undo**: Implement state history stack (capture tiles/pieces/turn/phase snapshots)
- **AI opponent**: Minimax with alpha-beta pruning on shallow depth (game tree is wide)
- **Online multiplayer**: Extract state to JSON, sync via WebSocket
- **Mobile app**: Wrap in React Native WebView or rebuild with native hex rendering

**Architecture migration path**:
If converting to a proper React app:
1. Extract game logic to custom hooks (`useGameState.js`)
2. Separate components: `Board.jsx`, `Piece.jsx`, `Tile.jsx`, `StatusBar.jsx`
3. Move constants to `constants.js`
4. Add Vite/Next.js build system
5. Replace CDN React with npm packages

## Game Rules Summary

**Turn sequence**:
1. Select your piece → click destination (slides to edge)
2. Select empty tile → click new position (must touch ≥2 tiles, keep board connected)

**Win condition**: Your 3 pieces form any connected shape (line, triangle, or V-shape)

**Edge cases**:
- Cannot move tile if it would split the board
- Cannot skip tile movement phase
- Pieces can't slide to current position (no valid destination)
