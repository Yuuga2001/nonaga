# ゲームロジック仕様

バージョン: 2.0
最終更新: 2026-01-27

---

## 目次

1. [スライド移動アルゴリズム](#1-スライド移動アルゴリズム)
2. [連結性チェックアルゴリズム](#2-連結性チェックアルゴリズム)
3. [タイル配置ルール](#3-タイル配置ルール)
4. [勝利判定アルゴリズム](#4-勝利判定アルゴリズム)
5. [AI評価関数](#5-ai評価関数)

---

## 1. スライド移動アルゴリズム

### 1.1 コマの移動ルール

- コマは6方向のいずれかに**直線スライド**する
- タイルの端 または 他のコマにぶつかるまで進む
- **最低1マス**は移動する必要がある

### 1.2 アルゴリズム

```typescript
function getSlideDestination(
  piece: Piece,
  direction: Tile,
  tiles: Tile[],
  pieces: Piece[]
): Tile | null {
  // タイル・コマの存在確認用Set/Map
  const tileSet = new Set(tiles.map(t => coordsKey(t.q, t.r)));
  const pieceMap = new Map(pieces.map(p => [coordsKey(p.q, p.r), p]));

  let q = piece.q;
  let r = piece.r;
  let lastValid: Tile | null = null;

  while (true) {
    // 次の座標
    const nextQ = q + direction.q;
    const nextR = r + direction.r;
    const nextKey = coordsKey(nextQ, nextR);

    // タイルが存在しない → 停止
    if (!tileSet.has(nextKey)) break;

    // 他のコマが存在 → 停止
    if (pieceMap.has(nextKey)) break;

    // 移動可能
    q = nextQ;
    r = nextR;
    lastValid = { q, r };
  }

  // 少なくとも1マス移動したか確認
  if (lastValid && (lastValid.q !== piece.q || lastValid.r !== piece.r)) {
    return lastValid;
  }
  return null;
}
```

### 1.3 実装例

**クライアント側（UI用）**:
```typescript
// online/lib/gameLogic.ts

export function getSlideDestinations(
  piece: Piece,
  tiles: Tile[],
  pieces: Piece[]
): Tile[] {
  const tileSet = new Set(tiles.map((t) => coordsKey(t.q, t.r)));
  const pieceMap = new Map(pieces.map((p) => [coordsKey(p.q, p.r), p]));

  const destinations: Tile[] = [];

  for (const dir of DIRECTIONS) {
    let q = piece.q;
    let r = piece.r;
    let lastValid: Tile | null = null;

    while (true) {
      const nextQ = q + dir.q;
      const nextR = r + dir.r;
      const nextKey = coordsKey(nextQ, nextR);

      if (!tileSet.has(nextKey)) break;
      if (pieceMap.has(nextKey)) break;

      q = nextQ;
      r = nextR;
      lastValid = { q, r };
    }

    if (lastValid && (lastValid.q !== piece.q || lastValid.r !== piece.r)) {
      destinations.push(lastValid);
    }
  }

  return destinations;
}
```

**サーバー側（検証用）**:
```typescript
// infra/lambda/gameHandler.ts

function isValidPieceMove(
  piece: Piece,
  toQ: number,
  toR: number,
  tiles: Tile[],
  pieces: Piece[]
): boolean {
  // Check if destination is reachable by sliding in any direction
  for (const dir of DIRECTIONS) {
    const dest = getSlideDestination(piece, dir, tiles, pieces);
    if (dest && dest.q === toQ && dest.r === toR) {
      return true;
    }
  }
  return false;
}
```

### 1.4 移動例

```
初期状態:
  ○ - ○ - ○ - ○
      ↑
    コマ（q=1, r=0）

右方向（{q:1, r:0}）にスライド:
  ○ - ○ - ○ - ○
              ↑
            到達位置（q=3, r=0）

他のコマがある場合:
  ○ - ○ - ● - ○
      ↑
    コマ（q=1, r=0）

右方向にスライド:
  ○ - ○ - ● - ○
          ↑
        停止位置（q=2, r=0）
```

---

## 2. 連結性チェックアルゴリズム

### 2.1 タイル移動の制約

- タイル移動後も**全タイルが連結**している必要がある
- 分断された盤面は許可されない

### 2.2 BFS（幅優先探索）アルゴリズム

```typescript
function isBoardConnected(tiles: Tile[], excludeIndex?: number): boolean {
  // 除外するタイルを除いたタイル配列
  const filteredTiles = excludeIndex !== undefined
    ? tiles.filter((_, i) => i !== excludeIndex)
    : tiles;

  if (filteredTiles.length === 0) return true;

  // BFS（幅優先探索）
  const tileSet = new Set(filteredTiles.map(t => coordsKey(t.q, t.r)));
  const visited = new Set<string>();
  const queue: Tile[] = [filteredTiles[0]];
  visited.add(coordsKey(filteredTiles[0].q, filteredTiles[0].r));

  while (queue.length > 0) {
    const current = queue.shift()!;

    // 6方向の隣接セルを探索
    for (const dir of DIRECTIONS) {
      const neighborKey = coordsKey(current.q + dir.q, current.r + dir.r);

      if (tileSet.has(neighborKey) && !visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({ q: current.q + dir.q, r: current.r + dir.r });
      }
    }
  }

  // 全タイルを訪問できたか
  return visited.size === filteredTiles.length;
}
```

### 2.3 連結性チェックの例

**連結している場合（OK）**:
```
○ - ○ - ○
    |
    ○

全4タイル → 全て訪問可能 → 連結
```

**分断されている場合（NG）**:
```
○ - ○   ○

        ○

2つのグループに分断 → 連結していない
```

### 2.4 実装での使用例

```typescript
// タイル移動時の検証
const isConnected = isBoardConnected(tiles, fromIndex);

if (!isConnected) {
  throw new Error('Board must remain connected');
}

// タイル配列を更新
tiles[fromIndex] = { q: toQ, r: toR };
```

---

## 3. タイル配置ルール

### 3.1 有効な配置条件

1. 既存タイルと重複しない
2. **少なくとも2つの既存タイルに隣接**する

### 3.2 アルゴリズム

```typescript
function getValidTileDestinations(
  selectedIndex: number,
  tiles: Tile[]
): Tile[] {
  const remaining = tiles.filter((_, i) => i !== selectedIndex);
  const candidates = new Map<string, { q: number; r: number; count: number }>();

  // 各既存タイルの隣接セルをカウント
  remaining.forEach(t => {
    DIRECTIONS.forEach(d => {
      const nQ = t.q + d.q;
      const nR = t.r + d.r;
      const key = coordsKey(nQ, nR);

      // 既存タイルと重複しない
      if (remaining.some(rt => rt.q === nQ && rt.r === nR)) return;
      if (tiles[selectedIndex].q === nQ && tiles[selectedIndex].r === nR) return;

      // カウント
      const existing = candidates.get(key) || { q: nQ, r: nR, count: 0 };
      candidates.set(key, { ...existing, count: existing.count + 1 });
    });
  });

  // 2つ以上のタイルに隣接する座標のみ
  return Array.from(candidates.values())
    .filter(c => c.count >= 2)
    .map(c => ({ q: c.q, r: c.r }));
}
```

### 3.3 配置例

**有効な配置先（×印）**:
```
既存タイル:
  ○ - ○
      |
      ○

配置候補:
  × - ○ - ×
      |
  × - ○ - ×
      |
      ○

×: 2タイル以上に隣接（有効）
```

**無効な配置先**:
```
  ○ - ○ - [無効]
      |
      ○ - [無効]

[無効]: 1タイルにのみ隣接
```

---

## 4. 勝利判定アルゴリズム

### 4.1 勝利条件

- 自分の3つのコマが**連結した配置**になる
- 連結 = 少なくとも2つの隣接ペアが存在

### 4.2 アルゴリズム

```typescript
function checkVictory(
  pieces: Piece[],
  player: 'red' | 'blue'
): string[] | null {
  const playerPieces = pieces.filter(p => p.player === player);
  if (playerPieces.length !== 3) return null;

  const [p1, p2, p3] = playerPieces;

  // 3つのペアの隣接判定
  const adj12 = isAdjacent(p1, p2);
  const adj23 = isAdjacent(p2, p3);
  const adj13 = isAdjacent(p1, p3);

  // 隣接ペア数をカウント
  const adjCount = [adj12, adj23, adj13].filter(Boolean).length;

  // 2ペア以上で勝利
  if (adjCount >= 2) {
    return playerPieces.map(p => coordsKey(p.q, p.r));
  }

  return null;
}

function isAdjacent(a: Tile, b: Tile): boolean {
  return DIRECTIONS.some(d => a.q + d.q === b.q && a.r + d.r === b.r);
}
```

### 4.3 勝利パターン

**パターン1: 直線配置**
```
●1 - ●2 - ●3

隣接ペア:
- ●1 と ●2: ✅
- ●2 と ●3: ✅
- ●1 と ●3: ❌

ペア数: 2 → 勝利
```

**パターン2: 三角形配置**
```
●1 - ●2
    |
   ●3

隣接ペア:
- ●1 と ●2: ✅
- ●2 と ●3: ✅
- ●1 と ●3: ❌

ペア数: 2 → 勝利
```

**パターン3: L字配置**
```
●1 - ●2
     |
    ●3

隣接ペア:
- ●1 と ●2: ✅
- ●2 と ●3: ✅
- ●1 と ●3: ❌

ペア数: 2 → 勝利
```

**非勝利パターン: 離れている**
```
●1   ●2

    ●3

隣接ペア:
- ●1 と ●2: ❌
- ●2 と ●3: ❌
- ●1 と ●3: ❌

ペア数: 0 → 勝利せず
```

### 4.4 実装での使用例

**サーバー側（Lambda）**:
```typescript
// コマ移動後に勝利判定
const updatedPieces = /* ... コマ位置更新 */;
const victoryCoords = checkVictory(updatedPieces, playerColor);

if (victoryCoords) {
  // 勝利
  await docClient.send(new UpdateCommand({
    // ...
    UpdateExpression: `
      SET phase = :phase,
          #status = :status,
          winner = :winner,
          victoryLine = :victoryLine
    `,
    ExpressionAttributeValues: {
      ':phase': 'ended',
      ':status': 'FINISHED',
      ':winner': playerColor,
      ':victoryLine': victoryCoords,
    },
  }));
}
```

**クライアント側**:
```typescript
// online/lib/gameLogic.ts
export function getVictoryCoords(
  pieces: Piece[],
  player: PlayerColor
): string[] | null {
  const playerPieces = pieces.filter((p) => p.player === player);
  if (playerPieces.length !== 3) return null;

  const [p1, p2, p3] = playerPieces;
  const adj12 = isAdjacent(p1, p2);
  const adj23 = isAdjacent(p2, p3);
  const adj13 = isAdjacent(p1, p3);

  const adjCount = [adj12, adj23, adj13].filter(Boolean).length;
  if (adjCount >= 2) {
    return playerPieces.map((p) => coordsKey(p.q, p.r));
  }

  return null;
}
```

---

## 5. AI評価関数

### 5.1 概要

**LocalGameClientのAI戦略**:
- 位置評価スコアリング方式
- 自分のコマ同士の距離を最小化
- 相手のコマ同士の距離を最大化

### 5.2 評価関数

```typescript
function evaluatePosition(pieces: Piece[], player: 'red' | 'blue'): number {
  const own = pieces.filter(p => p.player === player);
  const opp = pieces.filter(p => p.player !== player);

  // 自分のコマ同士の距離（小さいほど良い）
  const ownDist = distance(own[0], own[1]) +
                  distance(own[1], own[2]) +
                  distance(own[0], own[2]);

  // 相手のコマ同士の距離（大きいほど良い）
  const oppDist = distance(opp[0], opp[1]) +
                  distance(opp[1], opp[2]) +
                  distance(opp[0], opp[2]);

  return oppDist - ownDist * 2;  // 自分の距離を重視
}

function distance(a: Tile, b: Tile): number {
  // 六角座標の距離（キューブ座標変換）
  return (Math.abs(a.q - b.q) +
          Math.abs(a.r - b.r) +
          Math.abs(-a.q - a.r + b.q + b.r)) / 2;
}
```

### 5.3 AIの動作フロー

```typescript
function selectBestMove(
  game: GameState,
  player: 'red' | 'blue'
): Move {
  const allMoves = generateAllLegalMoves(game, player);

  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (const move of allMoves) {
    const newGame = applyMove(game, move);
    const score = evaluatePosition(newGame.pieces, player);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove!;
}
```

### 5.4 六角座標の距離計算

**マンハッタン距離（キューブ座標変換）**:
```typescript
// 軸座標 (q, r) → キューブ座標 (x, y, z)
// x = q
// y = r
// z = -q - r

function hexDistance(a: Tile, b: Tile): number {
  const dx = Math.abs(a.q - b.q);
  const dy = Math.abs(a.r - b.r);
  const dz = Math.abs((-a.q - a.r) - (-b.q - b.r));

  return (dx + dy + dz) / 2;
}
```

**例**:
```
(0,0) と (2,-1) の距離:
dx = |0 - 2| = 2
dy = |0 - (-1)| = 1
dz = |0 - 1| = 1

距離 = (2 + 1 + 1) / 2 = 2
```

### 5.5 AI強度

**現在の実装**:
- 1手先読み（評価関数のみ）
- 全合法手を評価
- 最も高いスコアを選択

**改善案**:
- 2-3手先読み（Minimax）
- アルファベータ枝刈り
- 開局定石データベース
- 機械学習ベースのAI（SageMaker）

---

## 関連ドキュメント

- [アーキテクチャ設計](./ARCHITECTURE.md)
- [インフラ構成詳細](./INFRASTRUCTURE.md)
- [API仕様](./API_REFERENCE.md)
- [デプロイメント](./DEPLOYMENT.md)
- [運用・監視](./OPERATIONS.md)
