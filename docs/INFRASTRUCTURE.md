# インフラ構成詳細

バージョン: 2.0
最終更新: 2026-01-27

---

## 目次

1. [AWS AppSync（GraphQL API）](#1-aws-appsyncgraphql-api)
2. [Amazon DynamoDB](#2-amazon-dynamodb)
3. [AWS Lambda](#3-aws-lambda)
4. [AWS Amplify Hosting](#4-aws-amplify-hosting)
5. [ネットワークフロー](#5-ネットワークフロー)

---

## 1. AWS AppSync（GraphQL API）

### 1.1 概要

**役割**: フロントエンドとバックエンドの統一的なAPIゲートウェイ

**設定**:
```typescript
認証方式: API Key認証
有効期限: 365日
X-Rayトレーシング: 有効
ログレベル: ERROR
リージョン: ap-northeast-1（東京）
```

### 1.2 データソース

**1. DynamoDB Data Source** (`GameDataSource`)
- **用途**: 読み取り専用クエリ（パフォーマンス最適化）
- **使用するResolver**: `getGame`, `getGameByRoomCode`
- **特徴**: Lambda経由せず直接DynamoDBアクセス

**2. Lambda Data Source** (`LambdaDataSource`)
- **用途**: 全てのMutation（書き込み操作）
- **使用するResolver**: `createGame`, `joinGame`, `movePiece`, `moveTile`, `abandonGame`, `rematchGame`
- **特徴**: ビジネスロジック検証を含む

### 1.3 Resolver詳細

| Resolver名 | タイプ | データソース | 処理内容 |
|-----------|--------|-------------|---------|
| GetGameResolver | Query | DynamoDB | gameIdでゲーム状態取得 |
| GetGameByRoomCodeResolver | Query | DynamoDB | roomCodeでゲーム検索（RoomCodeIndex使用） |
| CreateGameResolver | Mutation | Lambda | 新規ゲーム作成、roomCode生成 |
| JoinGameResolver | Mutation | Lambda | ゲーム参加、ステータス更新 |
| MovePieceResolver | Mutation | Lambda | コマ移動、勝利判定 |
| MoveTileResolver | Mutation | Lambda | タイル移動、連結性検証 |
| AbandonGameResolver | Mutation | Lambda | ゲーム放棄 |
| RematchGameResolver | Mutation | Lambda | 再戦リクエスト、新ゲーム作成 |

### 1.4 Resolver実装例

**GetGameResolver（DynamoDB直接アクセス）**:
```typescript
// リクエストマッピング
{
  "version": "2017-02-28",
  "operation": "GetItem",
  "key": {
    "gameId": $util.dynamodb.toDynamoDBJson($ctx.args.gameId)
  }
}

// レスポンスマッピング
$util.toJson($ctx.result)
```

**GetGameByRoomCodeResolver（GSI使用）**:
```typescript
// リクエストマッピング
{
  "version": "2017-02-28",
  "operation": "Query",
  "index": "RoomCodeIndex",
  "query": {
    "expression": "roomCode = :roomCode",
    "expressionValues": {
      ":roomCode": $util.dynamodb.toDynamoDBJson($ctx.args.roomCode)
    }
  },
  "limit": 1
}

// レスポンスマッピング
#if ($ctx.result.items.size() == 0)
  $util.toJson(null)
#else
  $util.toJson($ctx.result.items[0])
#end
```

---

## 2. Amazon DynamoDB

### 2.1 テーブル設計

```
テーブル名: NonagaGameSessions-{StackName}
パーティションキー: gameId (String)
課金モード: PAY_PER_REQUEST（オンデマンド）
TTL属性: ttl（24時間後に自動削除）
削除ポリシー: DESTROY（スタック削除時にテーブル削除）
```

### 2.2 属性定義

| 属性名 | 型 | 説明 | 例 |
|-------|---|------|---|
| gameId | String | ゲーム一意識別子（UUID） | `"a1b2c3d4-..."` |
| roomCode | String | 6桁マッチングコード | `"123456"` |
| status | String | ゲームステータス | `"WAITING"` / `"PLAYING"` / `"FINISHED"` / `"ABANDONED"` |
| hostPlayerId | String | ホストプレイヤーUUID | `"e5f6g7h8-..."` |
| guestPlayerId | String | ゲストプレイヤーUUID | `"i9j0k1l2-..."` |
| hostColor | String | ホストの色 | `"red"` / `"blue"` |
| tiles | List | タイル座標配列（19個） | `[{q:0,r:0}, ...]` |
| pieces | List | コマ配列（6個） | `[{id:"r1",player:"red",q:2,r:-2}, ...]` |
| turn | String | 現在のターン | `"red"` / `"blue"` |
| phase | String | ゲームフェーズ | `"waiting"` / `"move_token"` / `"move_tile"` / `"ended"` |
| winner | String | 勝者の色 | `"red"` / `"blue"` |
| victoryLine | List | 勝利コマ座標 | `["2,-2", "0,2", "-2,0"]` |
| lastMoveAt | String | 最終移動時刻（ISO 8601） | `"2026-01-27T12:34:56.789Z"` |
| createdAt | String | 作成時刻（ISO 8601） | `"2026-01-27T12:00:00.000Z"` |
| updatedAt | String | 更新時刻（ISO 8601） | `"2026-01-27T12:34:56.789Z"` |
| ttl | Number | TTL（Unix timestamp） | `1738071600` |

### 2.3 Global Secondary Indexes (GSI)

**1. StatusIndex**
```
パーティションキー: status (String)
ソートキー: createdAt (String)
プロジェクション: ALL（全属性）
用途: ステータス別ゲーム一覧（将来のマッチメイキング機能用）
```

**クエリ例**:
```typescript
await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  IndexName: 'StatusIndex',
  KeyConditionExpression: '#status = :status',
  ExpressionAttributeNames: {
    '#status': 'status',
  },
  ExpressionAttributeValues: {
    ':status': 'WAITING',
  },
  ScanIndexForward: false,  // 新しい順
  Limit: 10,
}));
```

**2. RoomCodeIndex**
```
パーティションキー: roomCode (String)
ソートキー: createdAt (String)
プロジェクション: ALL（全属性）
用途: ルームコードによる高速検索
```

**クエリ例**:
```typescript
await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  IndexName: 'RoomCodeIndex',
  KeyConditionExpression: 'roomCode = :roomCode',
  ExpressionAttributeValues: {
    ':roomCode': '123456',
  },
  Limit: 1,
}));
```

### 2.4 アクセスパターン

| パターン | 方法 | インデックス | クエリ例 |
|---------|------|------------|---------|
| ゲームID取得 | GetItem | メインテーブル | PK=gameId |
| ルームコード検索 | Query | RoomCodeIndex | roomCode="123456", Limit=1 |
| WAITING状態のゲーム一覧 | Query | StatusIndex | status="WAITING", SortBy=createdAt |

### 2.5 TTL（Time To Live）設計

**設定**:
```typescript
// ゲーム作成時
const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60;  // 24時間後

await docClient.send(new PutCommand({
  TableName: TABLE_NAME,
  Item: {
    gameId,
    // ... その他の属性
    ttl,
  },
}));
```

**動作**:
- DynamoDBが自動的に期限切れレコードを削除
- 削除タイミング: 48時間以内（通常数時間）
- コスト削減: ストレージ料金の削減

**24時間で削除する理由**:
- 放置されたゲームセッションのクリーンアップ
- ストレージコスト最適化
- 古いルームコードの再利用

### 2.6 パフォーマンス

**読み取り性能**:
- GetItem: ~10ms
- Query (GSI): ~20ms

**書き込み性能**:
- PutItem: ~15ms
- UpdateItem: ~15ms

**スループット**:
- PAY_PER_REQUEST: 自動スケーリング
- バーストキャパシティ: 最大40,000 RCU/WCU

---

## 3. AWS Lambda

### 3.1 関数設定

```typescript
関数名: NonagaStack-{StackName}-GameHandler
ランタイム: Node.js 20.x
ハンドラー: handler（gameHandler.ts）
メモリ: 256MB
タイムアウト: 10秒
同時実行数: デフォルト（1000）
バンドル: esbuild（minify + source map有効）
```

### 3.2 環境変数

```
TABLE_NAME: NonagaGameSessions-{StackName}
```

### 3.3 IAMロール権限

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:*:table/NonagaGameSessions-*",
        "arn:aws:dynamodb:ap-northeast-1:*:table/NonagaGameSessions-*/index/*"
      ]
    }
  ]
}
```

### 3.4 処理フロー例（movePiece）

```typescript
export async function handler(event: AppSyncEvent): Promise<GameSession> {
  const { field, arguments: args } = event;

  // 1. DynamoDBからゲーム状態取得
  const game = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { gameId: args.input.gameId },
  }));

  if (!game.Item) {
    throw new Error('Game not found');
  }

  // 2. バリデーション
  if (game.Item.status !== 'PLAYING') {
    throw new Error('Game is not active');
  }

  if (game.Item.phase !== 'move_token') {
    throw new Error('Wrong phase');
  }

  const playerColor = getPlayerColor(game.Item, args.input.playerId);
  if (!playerColor) {
    throw new Error('Player not in game');
  }

  if (game.Item.turn !== playerColor) {
    throw new Error('Not your turn');
  }

  // 3. ゲームロジック実行
  const piece = game.Item.pieces.find(p => p.id === args.input.pieceId);
  if (piece.player !== playerColor) {
    throw new Error('Not your piece');
  }

  const isValid = isValidPieceMove(
    piece,
    args.input.toQ,
    args.input.toR,
    game.Item.tiles,
    game.Item.pieces
  );

  if (!isValid) {
    throw new Error('Invalid move');
  }

  // 4. 状態更新
  const updatedPieces = game.Item.pieces.map(p =>
    p.id === args.input.pieceId
      ? { ...p, q: args.input.toQ, r: args.input.toR }
      : p
  );

  // 5. 勝利判定
  const victoryCoords = checkVictory(updatedPieces, playerColor);
  const isVictory = victoryCoords !== null;

  // 6. DynamoDBに保存
  const updatedGame = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { gameId: args.input.gameId },
    UpdateExpression: `
      SET pieces = :pieces,
          phase = :phase,
          #status = :status,
          winner = :winner,
          victoryLine = :victoryLine,
          lastMoveAt = :lastMoveAt,
          updatedAt = :updatedAt
    `,
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':pieces': updatedPieces,
      ':phase': isVictory ? 'ended' : 'move_tile',
      ':status': isVictory ? 'FINISHED' : 'PLAYING',
      ':winner': isVictory ? playerColor : null,
      ':victoryLine': victoryCoords,
      ':lastMoveAt': new Date().toISOString(),
      ':updatedAt': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  }));

  return updatedGame.Attributes as GameSession;
}
```

### 3.5 Cold Start対策

**現在の設定**:
- メモリ256MB（初期化時間短縮）
- esbuildによるバンドルサイズ最小化
- Provisioned Concurrency未使用（コスト最適化優先）

**Cold Start時間**:
- メモリ256MB: ~500ms
- メモリ512MB: ~300ms

**Warm実行**:
- 平均: ~50ms
- P99: ~200ms

---

## 4. AWS Amplify Hosting

### 4.1 設定

```yaml
appRoot: online
ビルド出力: .next/
Node.js バージョン: 20
デプロイモード: standalone（Next.js SSR + Static）
```

### 4.2 環境変数

**Amplify Consoleで設定**:
```
APPSYNC_ENDPOINT: https://xxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
APPSYNC_API_KEY: da2-xxxxxxxxxxxxxxxxxxxx
```

### 4.3 ビルドプロセス（amplify.yml）

```yaml
version: 1
applications:
  - appRoot: online
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - echo "APPSYNC_ENDPOINT=$APPSYNC_ENDPOINT" >> .env.production
            - echo "APPSYNC_API_KEY=$APPSYNC_API_KEY" >> .env.production
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

### 4.4 ルーティング

| パス | コンポーネント | 説明 |
|------|--------------|------|
| `/` | LocalGameClient | ローカルゲーム（AI/PvP） |
| `/online` | LobbyClient | ロビー（ゲーム作成・参加） |
| `/online/local` | LocalGameClient | ローカルゲーム（後方互換性） |
| `/game/[gameId]` | GameClient | オンラインゲーム |
| `/about` | AboutPage | アバウトページ（日本語） |
| `/en/about` | AboutPage | アバウトページ（英語） |

### 4.5 Next.js設定

**next.config.js**:
```javascript
module.exports = {
  output: 'standalone',  // 最小限のランタイム
};
```

**特徴**:
- SSR（Server-Side Rendering）対応
- 自動コード分割
- Image最適化
- CDN配信（CloudFront）

---

## 5. ネットワークフロー

### 5.1 クライアント → AppSync

```
クライアント（ブラウザ）
  ↓ HTTPS POST
Next.js API Routes (/api/game/*)
  ↓ Server-side GraphQL（API Key認証）
AWS AppSync
  ↓
DynamoDB / Lambda
```

**特徴**:
- API Keyはサーバーサイドのみで使用
- ブラウザに公開されない
- Next.js API Routesでレート制限・バリデーション可能

### 5.2 ポーリング更新フロー

```
GameClient.tsx
  ↓ 1秒ごとにGET
/api/game/[gameId]
  ↓ GraphQL Query
AppSync (getGame)
  ↓ DynamoDB GetItem
DynamoDB
  ↓ ゲーム状態返却
GameClient.tsx（状態更新）
```

**最適化**:
- `updatedAt` 比較で不要な再レンダリング削減
- アニメーション中はポーリングスキップ
- ABANDONED時は停止

### 5.3 スケーラビリティの限界

**想定規模**:
- 同時接続ゲーム: ~1,000
- 同時ユーザー: ~2,000

**限界点**:
- Lambda同時実行数: 1,000（デフォルト上限）
- DynamoDB: 実質無制限（PAY_PER_REQUEST）
- Amplify Hosting: CloudFront CDNで大量アクセス対応可能

**スケールアップ方法**:
- Lambda同時実行数上限引き上げ（AWSサポート申請）
- DynamoDB Provisioned Capacityに切り替え（予測可能な負荷）
- Lambda Provisioned Concurrency（Cold Start削減）

---

## 関連ドキュメント

- [アーキテクチャ設計](./ARCHITECTURE.md)
- [ゲームロジック仕様](./GAME_LOGIC.md)
- [API仕様](./API_REFERENCE.md)
- [デプロイメント](./DEPLOYMENT.md)
- [運用・監視](./OPERATIONS.md)
