# API仕様書

バージョン: 2.0
最終更新: 2026-01-27

---

## 目次

1. [Next.js API Routes](#1-nextjs-api-routes)
2. [GraphQL スキーマ](#2-graphql-スキーマ)
3. [リアルタイム同期設計](#3-リアルタイム同期設計)
4. [マッチメイキング仕様](#4-マッチメイキング仕様)

---

## 1. Next.js API Routes

### 1.1 ゲーム作成

**エンドポイント**: `POST /api/game`

**リクエスト**:
```typescript
{
  playerId: string;  // ホストプレイヤーのUUID
}
```

**レスポンス**:
```typescript
{
  gameId: string;
  roomCode: string;           // 6桁数字
  status: "WAITING";
  hostPlayerId: string;
  hostColor: "red" | "blue";  // ランダム
  tiles: Tile[];              // 19個
  pieces: Piece[];            // 6個
  turn: "red";
  phase: "waiting";
  createdAt: string;          // ISO 8601
  updatedAt: string;
  ttl: number;                // Unix timestamp（24時間後）
}
```

**内部処理**:
1. GraphQL Mutation `createGame` を呼び出し
2. Lambda が新規ゲームセッション作成
3. DynamoDB に保存

**使用例**:
```typescript
const res = await fetch('/api/game', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId: getPlayerId() }),
});

const game = await res.json();
router.push(`/game/${game.gameId}`);
```

---

### 1.2 ルームコード検索

**エンドポイント**: `GET /api/game/room/[roomCode]`

**パラメータ**:
- `roomCode`: 6桁数字文字列（例: "123456"）

**レスポンス**:
```typescript
{
  gameId: string;
  roomCode: string;
  status: "WAITING" | "PLAYING" | "FINISHED";
  // ... その他ゲーム状態
}
```

**エラー**:
```typescript
{
  error: "Game not found"
}  // 404
```

**内部処理**:
1. GraphQL Query `getGameByRoomCode` を呼び出し
2. RoomCodeIndex GSI でクエリ
3. 最初の1件を返す

**使用例**:
```typescript
const res = await fetch(`/api/game/room/${roomCode}`);
if (!res.ok) {
  setError('ゲームが見つかりません');
  return;
}

const game = await res.json();
if (game.status !== 'WAITING') {
  setError('ゲームは既に開始されています');
  return;
}

router.push(`/game/${game.gameId}`);
```

---

### 1.3 ゲーム状態取得

**エンドポイント**: `GET /api/game/[gameId]`

**レスポンス**:
```typescript
GameSession  // 完全なゲーム状態
```

**用途**: ポーリング更新（1秒間隔）

**使用例**:
```typescript
const poll = async () => {
  const res = await fetch(`/api/game/${gameId}`);
  if (!res.ok) return;

  const newGame = await res.json();

  // 更新がない場合はスキップ
  if (newGame.updatedAt === lastUpdateRef.current) return;

  lastUpdateRef.current = newGame.updatedAt;
  setGame(newGame);
};

// 1秒間隔でポーリング
const intervalId = setInterval(poll, 1000);
```

---

### 1.4 ゲーム参加

**エンドポイント**: `POST /api/game/[gameId]/join`

**リクエスト**:
```typescript
{
  playerId: string;  // ゲストプレイヤーのUUID
}
```

**レスポンス**:
```typescript
GameSession  // status: "PLAYING" に更新
```

**バリデーション**:
- `status` が `"WAITING"`
- `guestPlayerId` が未設定
- `hostPlayerId` とは異なるUUID

**使用例**:
```typescript
const joinRes = await fetch(`/api/game/${gameId}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId: getPlayerId() }),
});

if (joinRes.ok) {
  const gameData = await joinRes.json();
  setGame(gameData);
  setLoading(false);
}
```

---

### 1.5 コマ移動

**エンドポイント**: `POST /api/game/[gameId]/move`

**リクエスト**:
```typescript
{
  playerId: string;
  pieceId: string;     // 例: "r1", "b2"
  toQ: number;
  toR: number;
  type: "piece";
}
```

**レスポンス**:
```typescript
GameSession  // 更新後の状態
```

**バリデーション**:
- `phase` が `"move_token"`
- 自分のターン
- 自分のコマ
- スライド移動可能な座標

**副作用**:
- 勝利条件チェック
- 勝利時: `phase: "ended"`, `status: "FINISHED"`, `winner` 設定

**使用例**:
```typescript
const res = await fetch(`/api/game/${gameId}/move`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId,
    pieceId: selectedId,
    toQ: clickedTile.q,
    toR: clickedTile.r,
    type: 'piece',
  }),
});

if (res.ok) {
  const updatedGame = await res.json();
  setGame(updatedGame);
} else {
  const errorData = await res.json();
  setError(errorData.error);
}
```

---

### 1.6 タイル移動

**エンドポイント**: `POST /api/game/[gameId]/move`

**リクエスト**:
```typescript
{
  playerId: string;
  fromIndex: number;   // タイル配列のインデックス（0-18）
  toQ: number;
  toR: number;
  type: "tile";
}
```

**レスポンス**:
```typescript
GameSession  // 更新後の状態
```

**バリデーション**:
- `phase` が `"move_tile"`
- 自分のターン
- 移動先が2タイル以上に隣接
- 盤面連結性が保たれる

**副作用**:
- `turn` 反転
- `phase: "move_token"` に戻る

**使用例**:
```typescript
const res = await fetch(`/api/game/${gameId}/move`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId,
    fromIndex: selectedId,
    toQ: clickedTile.q,
    toR: clickedTile.r,
    type: 'tile',
  }),
});

if (res.ok) {
  const updatedGame = await res.json();
  setGame(updatedGame);
}
```

---

### 1.7 ゲーム放棄

**エンドポイント**: `DELETE /api/game/[gameId]`

**リクエスト**:
```typescript
{
  playerId: string;
}
```

**レスポンス**:
```typescript
GameSession  // status: "ABANDONED"
```

**使用例**:
```typescript
const res = await fetch(`/api/game/${gameId}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId }),
});

if (res.ok) {
  router.push('/online');
}
```

---

### 1.8 リマッチリクエスト

**エンドポイント**: `POST /api/game/[gameId]/rematch`

**リクエスト**:
```typescript
{
  playerId: string;
}
```

**レスポンス**:
```typescript
GameSession  // 新しいゲームID
```

**処理**:
1. 既存ゲームの `status` を `"ABANDONED"` に変更
2. 同じプレイヤーで新規ゲーム作成
3. `hostColor` を交代
4. 新しい `roomCode` 生成

**使用例**:
```typescript
const res = await fetch(`/api/game/${gameId}/rematch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerId }),
});

if (res.ok) {
  const newGame = await res.json();
  router.push(`/game/${newGame.gameId}`);
}
```

---

### 1.9 エラーレスポンス

**共通エラーフォーマット**:
```typescript
{
  error: string;  // エラーメッセージ
}
```

**HTTPステータスコード**:
- `400 Bad Request`: バリデーションエラー
- `404 Not Found`: ゲーム/ルームが見つからない
- `403 Forbidden`: 権限エラー（他人のターン、他人のコマ）
- `500 Internal Server Error`: サーバーエラー

**エラーメッセージ例**:
```typescript
// ゲームが見つからない
{ error: "Game not found" }

// 自分のターンではない
{ error: "Not your turn" }

// 無効な移動
{ error: "Invalid move" }

// フェーズエラー
{ error: "Wrong phase" }

// 盤面連結性エラー
{ error: "Board must remain connected" }
```

---

## 2. GraphQL スキーマ

### 2.1 型定義

```graphql
type Tile {
  q: Int!
  r: Int!
}

type Piece {
  id: String!
  player: String!
  q: Int!
  r: Int!
}

type GameSession {
  gameId: ID!
  roomCode: String
  status: GameStatus!
  hostPlayerId: String!
  guestPlayerId: String
  hostColor: String!
  tiles: [Tile!]!
  pieces: [Piece!]!
  turn: String!
  phase: String!
  winner: String
  victoryLine: [String!]
  lastMoveAt: AWSDateTime
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  ttl: Int
}

enum GameStatus {
  WAITING
  PLAYING
  FINISHED
  ABANDONED
}

input TileInput {
  q: Int!
  r: Int!
}

input PieceInput {
  id: String!
  player: String!
  q: Int!
  r: Int!
}

input MovePieceInput {
  gameId: ID!
  playerId: String!
  pieceId: String!
  toQ: Int!
  toR: Int!
}

input MoveTileInput {
  gameId: ID!
  playerId: String!
  fromIndex: Int!
  toQ: Int!
  toR: Int!
}
```

### 2.2 Query

```graphql
type Query {
  getGame(gameId: ID!): GameSession
  getGameByRoomCode(roomCode: String!): GameSession
}
```

### 2.3 Mutation

```graphql
type Mutation {
  createGame(hostPlayerId: String!): GameSession!
  joinGame(gameId: ID!, guestPlayerId: String!): GameSession!
  movePiece(input: MovePieceInput!): GameSession!
  moveTile(input: MoveTileInput!): GameSession!
  abandonGame(gameId: ID!, playerId: String!): GameSession!
  rematchGame(gameId: ID!, playerId: String!): GameSession!
}
```

### 2.4 Subscription

```graphql
type Subscription {
  onGameUpdated(gameId: ID!): GameSession
    @aws_subscribe(mutations: [
      "joinGame",
      "movePiece",
      "moveTile",
      "abandonGame",
      "rematchGame"
    ])
}
```

**注意**: Subscriptionは定義されているが、実装では使用していません（ポーリング方式を採用）。

---

## 3. リアルタイム同期設計

### 3.1 ポーリング方式の選択理由

**採用方式**: 1秒間隔のHTTPポーリング

**WebSocket/Subscriptionを使わない理由**:
1. **シンプルさ**: HTTPのみで実装可能、WebSocket接続管理不要
2. **コスト**: AppSync Subscriptionはリアルタイム接続ごとに課金
3. **スケーラビリティ**: ステートレス、Lambda/DynamoDBの自動スケーリング活用
4. **ゲーム特性**: ターン制ゲーム、1秒遅延は許容範囲

**トレードオフ**:
- ❌ 1秒の遅延（リアルタイム性は低い）
- ❌ 不要なリクエスト（変更がなくてもポーリング）
- ✅ 実装がシンプル
- ✅ デバッグが容易
- ✅ コストが予測可能

### 3.2 ポーリング実装詳細

**GameClient.tsxのポーリングループ**:

```typescript
useEffect(() => {
  if (!game || game.status === 'ABANDONED') {
    return;
  }

  const poll = async () => {
    // アニメーション中はスキップ（状態競合防止）
    if (isAnimatingRef.current) return;

    try {
      const res = await fetch(`/api/game/${gameId}`);
      if (!res.ok) return;

      const newGame: GameSession = await res.json();

      // 更新がない場合はスキップ
      if (newGame.updatedAt === lastUpdateRef.current) return;

      lastUpdateRef.current = newGame.updatedAt;
      setGame(newGame);

      // 勝利検出
      if (newGame.status === 'FINISHED' && newGame.winner) {
        // 勝利メッセージ表示
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  // 初回実行
  poll();

  // 1秒間隔でポーリング
  pollingRef.current = setInterval(poll, 1000);

  return () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };
}, [game?.status, gameId]);
```

**ポーリングの最適化**:
1. **アニメーション中スキップ**: 状態競合を防止
2. **updatedAt比較**: 変更がない場合は画面更新しない
3. **ABANDONED時停止**: 放棄されたゲームはポーリング不要
4. **エラーハンドリング**: エラーが発生してもポーリング継続

### 3.3 楽観的UI更新

**コマ・タイル移動時の動作**:

```typescript
// 1. ユーザー操作（即座に反映）
setAnimatingPiece({ id: pieceId, x: targetX, y: targetY });
setIsAnimating(true);

// 2. アニメーション開始（500ms）
// CSS transition: transform 500ms ease-out

// 3. API リクエスト（並行）
const res = await fetch(`/api/game/${gameId}/move`, {
  method: 'POST',
  body: JSON.stringify({ playerId, pieceId, toQ, toR, type: 'piece' }),
});

// 4. レスポンス処理
if (res.ok) {
  const updatedGame = await res.json();
  setGame(updatedGame);  // サーバー状態で上書き
} else {
  // エラー時: ロールバック
  setGame(originalGame);
  showErrorMessage();
}

// 5. アニメーション終了
setTimeout(() => {
  setIsAnimating(false);
  setAnimatingPiece(null);
}, 500);
```

**メリット**:
- 操作が即座にフィードバックされる（UX向上）
- サーバー検証後に正しい状態に収束

### 3.4 リトライ戦略

```typescript
async function moveWithRetry(payload, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`/api/game/${gameId}/move`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json();
      }

      // 4xx エラー（バリデーションエラー）: リトライしない
      if (res.status >= 400 && res.status < 500) {
        throw new Error('Invalid move');
      }

      // 5xx エラー: リトライ
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
```

---

## 4. マッチメイキング仕様

### 4.1 ルームコード生成

**仕様**:
- 6桁の数字（100000～999999）
- ランダム生成
- 重複チェック（最大8回リトライ）

**生成アルゴリズム**:
```typescript
async function generateRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    // 100000～999999のランダム整数
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // RoomCodeIndexで重複チェック
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'RoomCodeIndex',
        KeyConditionExpression: 'roomCode = :roomCode',
        ExpressionAttributeValues: {
          ':roomCode': code,
        },
        Limit: 1,
      })
    );

    // 重複なし: 使用可能
    if (!result.Items || result.Items.length === 0) {
      return code;
    }

    // 重複あり: 再生成
  }

  throw new Error('Failed to generate unique room code');
}
```

**重複確率**:
- 総数: 900,000パターン
- 同時アクティブゲーム数: ~1,000
- 重複確率: ~0.1%
- 8回リトライで重複回避確率: ~99.9999%

### 4.2 ルームコード入力UI

**入力バリデーション（クライアント側）**:
```typescript
const normalized = roomCode.trim().replace(/\s+/g, '');  // 空白除去
const digitsOnly = normalized.replace(/\D/g, '');        // 数字のみ抽出

if (digitsOnly.length !== 6) {
  setError('ルーム番号を確認してください');
  return;
}

// APIリクエスト
const res = await fetch(`/api/game/room/${digitsOnly}`);
```

**ユーザー体験**:
- 数字以外の文字は自動削除（"-"、空白など）
- "123-456" → "123456"
- "12 34 56" → "123456"

### 4.3 マッチング完了フロー

```
[ホスト]                              [ゲスト]
   │                                     │
   │ ゲーム作成                          │
   │ roomCode: "123456"                  │
   │ ↓                                   │
   │ roomCode を共有                     │
   │ （URL、口頭、メッセージアプリ等）    │
   │ ─────────────────────────────────→ │
   │                                     │ roomCode入力: "123456"
   │                                     │ ↓
   │                                     │ GET /api/game/room/123456
   │                                     │ ↓
   │                                     │ POST /api/game/[gameId]/join
   │                                     │ ↓
   │ ← ポーリングで検知 ────────────────── │ ゲーム開始
   │ status: "PLAYING"                   │ status: "PLAYING"
   │                                     │
   │ ゲーム進行                           │ ゲーム進行
```

### 4.4 URL共有との比較

**ルームコード方式の利点**:
- ✅ 口頭で伝えやすい（6桁の数字のみ）
- ✅ メモ・チャット送信が簡単
- ✅ URLの長さを気にしない

**URL方式（従来）**:
- ❌ 長い（例: `https://nonaga.riverapp.jp/game/a1b2c3d4-e5f6-...`）
- ❌ コピー＆ペースト必須
- ✅ ワンクリックで参加可能

**両方サポート**:
- URLから直接アクセス: `/game/[gameId]`
- ルームコード入力: `/online` → 「ルームに参加」

---

## 関連ドキュメント

- [アーキテクチャ設計](./ARCHITECTURE.md)
- [インフラ構成詳細](./INFRASTRUCTURE.md)
- [ゲームロジック仕様](./GAME_LOGIC.md)
- [デプロイメント](./DEPLOYMENT.md)
- [運用・監視](./OPERATIONS.md)
