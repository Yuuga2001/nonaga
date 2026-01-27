# アーキテクチャ設計書

バージョン: 2.0
最終更新: 2026-01-27

---

## 目次

1. [システム概要](#1-システム概要)
2. [システム全体構成](#2-システム全体構成)
3. [データモデル詳細](#3-データモデル詳細)

---

## 1. システム概要

### 1.1 プロジェクト概要

**NONAGA（ノナガ）**は、六角形の盤面を動かして戦う戦略ボードゲームです。3つのコマを隣接させたプレイヤーが勝利します。

### 1.2 主要機能

- **ローカル対戦（バニラ版）**: CDN版React使用、ビルド不要の単一HTMLファイル
- **ローカル対戦（Next.js版）**: AI対戦・2人対戦をサポート
- **オンライン対戦**: リアルタイムマルチプレイヤー、6桁ルームコードによるマッチメイキング
- **多言語対応**: 日本語・英語
- **レスポンシブデザイン**: PC・タブレット・スマホ対応

### 1.3 ターゲット環境

- **ブラウザ**: Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
- **デバイス**: デスクトップ、タブレット、スマートフォン
- **画面解像度**: 320px～4K対応

### 1.4 技術スタック概要

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15, React 19, TypeScript |
| バックエンド | AWS AppSync (GraphQL), AWS Lambda (Node.js 20) |
| データベース | Amazon DynamoDB |
| インフラ | AWS CDK (TypeScript) |
| ホスティング | AWS Amplify |
| CI/CD | GitHub Actions |

---

## 2. システム全体構成

### 2.1 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー（ブラウザ）                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ バニラ版    │  │ ローカル版  │  │ オンライン版 │            │
│  │ (HTML/CDN)  │  │  (Next.js)  │  │  (Next.js)  │            │
│  └─────────────┘  └─────────────┘  └──────┬──────┘            │
└───────────────────────────────────────────┼────────────────────┘
                                            │
                                            │ HTTPS
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Amplify Hosting                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Next.js Application (SSR + Static)                         │ │
│  │  - Root: LocalGameClient (/)                               │ │
│  │  - Lobby: LobbyClient (/online)                            │ │
│  │  - Game: GameClient (/game/[gameId])                       │ │
│  │  - API Routes (/api/game/*)                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTPS (Server-side only)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS AppSync (GraphQL API)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Key 認証 (365日有効)                                    │ │
│  │ X-Ray トレーシング有効                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │ DynamoDB Resolver    │      │ Lambda Resolver      │        │
│  │ (getGame, getRoomCode)│      │ (Mutations)          │        │
│  └──────────┬───────────┘      └──────────┬───────────┘        │
└─────────────┼──────────────────────────────┼────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│   Amazon DynamoDB        │   │     AWS Lambda                   │
│                          │   │  ┌────────────────────────────┐  │
│  Table: NonagaGameSessions│  │  │ gameHandler.ts             │  │
│  ┌────────────────────┐ │   │  │  - createGame              │  │
│  │ PK: gameId         │ │   │  │  - joinGame                │  │
│  │ TTL: 24時間        │ │   │  │  - movePiece               │  │
│  └────────────────────┘ │   │  │  - moveTile                │  │
│                          │   │  │  - abandonGame             │  │
│  GSI:                    │   │  │  - rematchGame             │  │
│  ┌────────────────────┐ │   │  │  Runtime: Node.js 20       │  │
│  │ StatusIndex        │ │   │  │  Memory: 256MB             │  │
│  │ (status+createdAt) │ │   │  │  Timeout: 10秒             │  │
│  └────────────────────┘ │   │  └────────────────────────────┘  │
│  ┌────────────────────┐ │   │                                  │
│  │ RoomCodeIndex      │ │   │  環境変数:                       │
│  │ (roomCode+createdAt)│ │  │  TABLE_NAME: DynamoDBテーブル名│
│  └────────────────────┘ │   └──────────────────────────────────┘
│                          │
│  Billing: PAY_PER_REQUEST│
└──────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
│  ┌────────────────────┐        ┌──────────────────────┐         │
│  │ deploy-infra.yml   │        │ deploy-frontend.yml  │         │
│  │ (infra/**変更時)   │        │ (online/**変更時)    │         │
│  │                    │        │                      │         │
│  │ 1. CDK Bootstrap   │        │ 1. CloudFormation    │         │
│  │ 2. CDK Deploy      │        │    から環境変数取得  │         │
│  │ 3. 出力をExport    │        │ 2. Next.js Build     │         │
│  └────────────────────┘        │ 3. Amplifyがデプロイ │         │
│                                 └──────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー図

#### 2.2.1 ゲーム作成フロー

```
[クライアント]
  │
  │ POST /api/game
  │ { playerId: "uuid" }
  ↓
[Next.js API Route]
  │
  │ GraphQL Mutation: createGame(hostPlayerId)
  ↓
[AppSync]
  │
  │ Lambda Resolver
  ↓
[Lambda: gameHandler]
  │
  ├─ gameId生成（UUID）
  ├─ roomCode生成（6桁、重複チェック）
  ├─ hostColor決定（ランダム: red/blue）
  ├─ 初期状態設定
  │   - tiles: INITIAL_TILES（19個）
  │   - pieces: INITIAL_PIECES（6個）
  │   - turn: "red"
  │   - phase: "waiting"
  │   - status: "WAITING"
  │   - ttl: 現在時刻 + 24時間
  │
  │ PutItem
  ↓
[DynamoDB]
  │
  │ 新規ゲームセッション保存
  │ 自動的にStatusIndex, RoomCodeIndexに追加
  ↓
[クライアント]
  │
  │ レスポンス: { gameId, roomCode, ... }
  │ リダイレクト: /game/[gameId]
```

#### 2.2.2 ゲーム参加フロー

```
[クライアント]
  │
  │ 1. ルームコード入力（例: "123456"）
  │ GET /api/game/room/123456
  ↓
[Next.js API Route]
  │
  │ GraphQL Query: getGameByRoomCode(roomCode: "123456")
  ↓
[AppSync]
  │
  │ DynamoDB Resolver（RoomCodeIndex使用）
  ↓
[DynamoDB]
  │
  │ Query: roomCode="123456", Limit=1
  │ レスポンス: { gameId, status, ... }
  ↓
[クライアント]
  │
  │ 2. status="WAITING" 確認
  │ POST /api/game/[gameId]/join
  │ { playerId: "uuid" }
  ↓
[Next.js API Route]
  │
  │ GraphQL Mutation: joinGame(gameId, guestPlayerId)
  ↓
[AppSync → Lambda]
  │
  ├─ ゲーム状態取得
  ├─ バリデーション
  │   - status == "WAITING"
  │   - guestPlayerId未設定
  │   - hostPlayerId != guestPlayerId
  ├─ 状態更新
  │   - guestPlayerId設定
  │   - status: "PLAYING"
  │   - phase: "move_token"
  │   - lastMoveAt: 現在時刻
  │
  │ UpdateItem
  ↓
[DynamoDB]
  │
  │ ゲーム状態更新
  ↓
[クライアント]
  │
  │ ゲーム画面表示
  │ ポーリング開始（1秒間隔）
```

#### 2.2.3 コマ移動フロー

```
[クライアント: GameClient.tsx]
  │
  │ ユーザーがコマをクリック
  │ - selectedId設定
  │ - getSlideDestinations()でハイライト
  │
  │ ユーザーが移動先をクリック
  │ POST /api/game/[gameId]/move
  │ { playerId, pieceId, toQ, toR, type: "piece" }
  ↓
[Next.js API Route]
  │
  │ GraphQL Mutation: movePiece(input)
  ↓
[AppSync → Lambda]
  │
  ├─ ゲーム状態取得
  ├─ バリデーション
  │   - status == "PLAYING"
  │   - phase == "move_token"
  │   - playerId認証
  │   - ターン確認
  │   - コマ所有権確認
  ├─ 移動可能性チェック
  │   - getSlideDestination()で6方向検証
  │   - 移動先が有効か確認
  ├─ 状態更新
  │   - pieces配列のコマ位置更新
  │   - phase: "move_tile"
  │   - lastMoveAt: 現在時刻
  ├─ 勝利判定
  │   - checkVictory()
  │   - 3駒が連結（隣接ペア≥2）
  │   - 勝利時: phase="ended", status="FINISHED", winner設定
  │
  │ UpdateItem
  ↓
[DynamoDB]
  │
  │ ゲーム状態更新
  ↓
[クライアント]
  │
  │ アニメーション実行（500ms）
  │ 次のポーリングで最新状態取得
  │ 勝利時: 勝利メッセージ表示
```

#### 2.2.4 タイル移動フロー

```
[クライアント: GameClient.tsx]
  │
  │ ユーザーがタイルをクリック
  │ - selectedId設定（タイルインデックス）
  │ - getValidTileDestinations()でハイライト
  │
  │ ユーザーが移動先をクリック
  │ POST /api/game/[gameId]/move
  │ { playerId, fromIndex, toQ, toR, type: "tile" }
  ↓
[Next.js API Route]
  │
  │ GraphQL Mutation: moveTile(input)
  ↓
[AppSync → Lambda]
  │
  ├─ ゲーム状態取得
  ├─ バリデーション
  │   - status == "PLAYING"
  │   - phase == "move_tile"
  │   - playerId認証
  │   - ターン確認
  ├─ 移動先検証
  │   - 既存タイルと重複しない
  │   - 少なくとも2つのタイルに隣接
  ├─ 連結性チェック
  │   - isBoardConnected(tiles, excludeIndex)
  │   - BFSで全タイルが連結しているか確認
  │   - 連結しない場合: エラー
  ├─ 状態更新
  │   - tiles配列の指定インデックス更新
  │   - turn: 反転（"red" ↔ "blue"）
  │   - phase: "move_token"
  │   - lastMoveAt: 現在時刻
  │
  │ UpdateItem
  ↓
[DynamoDB]
  │
  │ ゲーム状態更新
  ↓
[クライアント]
  │
  │ アニメーション実行（500ms）
  │ ターン切り替え
  │ 次のプレイヤーがコマを動かす
```

### 2.3 スケーラビリティ設計

**水平スケーリング**:
- DynamoDB: PAY_PER_REQUESTモード（自動スケーリング）
- Lambda: 同時実行数自動スケーリング（最大1000）
- Amplify: CDN配信（CloudFront）

**想定負荷**:
- 同時接続ゲーム数: ~1,000ゲーム
- 同時ユーザー数: ~2,000ユーザー
- リクエスト頻度: 1ユーザーあたり1秒に1回（ポーリング）
- ピーク時QPS: ~2,000 QPS

**コスト最適化**:
- DynamoDB TTLによる自動削除（ストレージコスト削減）
- Lambda Provisioned Concurrency未使用
- AppSync直接DynamoDBアクセス（読み取り専用）

---

## 3. データモデル詳細

### 3.1 六角座標系（Axial Coordinates）

NONAGAは**軸座標系（Axial Coordinates）**を使用します。

**定義**:
```typescript
interface Tile {
  q: number;  // 横軸（右方向が正）
  r: number;  // 斜め軸（左下方向が正）
}
```

**座標系の特徴**:
- 2次元座標で六角形グリッドを表現
- 第3軸 `s = -q - r`（冗長なため省略）
- 6方向の隣接セル定義が簡潔

**6方向ベクトル**:
```typescript
const DIRECTIONS = [
  { q: 1, r: 0 },   // 右
  { q: 1, r: -1 },  // 右上
  { q: 0, r: -1 },  // 左上
  { q: -1, r: 0 },  // 左
  { q: -1, r: 1 },  // 左下
  { q: 0, r: 1 },   // 右下
];
```

**座標キー生成**:
```typescript
function coordsKey(q: number, r: number): string {
  return `${q},${r}`;  // 例: "2,-1"
}
```

**画面座標変換**:
```typescript
function hexToPixel(q: number, r: number): { x: number; y: number } {
  const HEX_SIZE = 38;  // ピクセル
  return {
    x: HEX_SIZE * (3/2 * q),
    y: HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r),
  };
}
```

**座標系の例**:
```
       (-1,-1)  (0,-1)
    (-2,0) (-1,0)  (0,0)  (1,0)
       (-1,1)  (0,1)  (1,1)
```

### 3.2 初期ゲーム状態

**タイル配置（19個）**:
```typescript
const INITIAL_TILES: Tile[] = [
  { q: 0, r: 0 },      // 中央
  { q: 1, r: 0 }, { q: -1, r: 0 },     // 横方向
  { q: 0, r: 1 }, { q: 0, r: -1 },     // 縦方向
  { q: 1, r: -1 }, { q: -1, r: 1 },    // 斜め
  { q: 2, r: 0 }, { q: -2, r: 0 },     // 外周横
  { q: 0, r: 2 }, { q: 0, r: -2 },     // 外周縦
  { q: 2, r: -1 }, { q: -2, r: 1 },    // 外周斜め
  { q: 1, r: 1 }, { q: -1, r: -1 },    // 内側斜め
  { q: 2, r: -2 }, { q: -2, r: 2 },    // 角
  { q: 1, r: -2 }, { q: -1, r: 2 },    // 角隣接
];
```

**コマ配置（6個）**:
```typescript
const INITIAL_PIECES: Piece[] = [
  // 赤（3個）
  { id: 'r1', player: 'red', q: 2, r: -2 },
  { id: 'r2', player: 'red', q: 0, r: 2 },
  { id: 'r3', player: 'red', q: -2, r: 0 },

  // 青（3個）
  { id: 'b1', player: 'blue', q: 2, r: 0 },
  { id: 'b2', player: 'blue', q: -2, r: 2 },
  { id: 'b3', player: 'blue', q: 0, r: -2 },
];
```

**初期配置図**:
```
         b3
      r3    r1
         ○
      b1    b2
         r2

○: 中央タイル
r1/r2/r3: 赤コマ
b1/b2/b3: 青コマ
```

### 3.3 ゲーム状態定義

**GameSession型**:
```typescript
interface GameSession {
  gameId: string;
  roomCode?: string;           // 6桁マッチングコード
  status: GameStatus;
  hostPlayerId: string;
  guestPlayerId?: string;
  hostColor: PlayerColor;
  tiles: Tile[];               // 19個
  pieces: Piece[];             // 6個
  turn: PlayerColor;
  phase: GamePhase;
  winner?: PlayerColor;
  victoryLine?: string[];
  lastMoveAt?: string;
  createdAt: string;
  updatedAt: string;
  ttl: number;
}

type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'ABANDONED';
type GamePhase = 'waiting' | 'move_token' | 'move_tile' | 'ended';
type PlayerColor = 'red' | 'blue';
```

### 3.4 ゲームフェーズ遷移

```
WAITING (待機中)
   │
   │ ゲスト参加
   ↓
PLAYING - move_token (コマ移動フェーズ)
   │        │
   │        │ コマ移動
   │        ↓
   │      move_tile (タイル移動フェーズ)
   │        │
   │        │ タイル移動
   │        ↓
   │      move_token（ターン切り替え）
   │        │
   │        │ 勝利条件満たす
   │        ↓
   └──→  ended (ゲーム終了)
            │
            │ リマッチ
            ↓
         WAITING (新ゲーム)
```

### 3.5 ゲームステータス

| ステータス | 説明 | 許可される操作 |
|-----------|------|--------------|
| WAITING | ゲスト待ち | joinGame |
| PLAYING | ゲーム進行中 | movePiece, moveTile, abandonGame |
| FINISHED | ゲーム終了 | rematchGame, abandonGame |
| ABANDONED | ゲーム放棄 | なし |

---

## 関連ドキュメント

- [インフラ構成詳細](./INFRASTRUCTURE.md)
- [ゲームロジック仕様](./GAME_LOGIC.md)
- [API仕様](./API_REFERENCE.md)
- [デプロイメント](./DEPLOYMENT.md)
- [運用・監視](./OPERATIONS.md)
