# 運用・監視ガイド

バージョン: 2.0
最終更新: 2026-01-27

---

## 目次

1. [認証・セキュリティ](#1-認証セキュリティ)
2. [UI/UX仕様](#2-uiux仕様)
3. [パフォーマンス要件](#3-パフォーマンス要件)
4. [エラーハンドリング](#4-エラーハンドリング)
5. [モニタリング・ロギング](#5-モニタリングロギング)
6. [制約事項・既知の問題](#6-制約事項既知の問題)
7. [今後の拡張性](#7-今後の拡張性)

---

## 1. 認証・セキュリティ

### 1.1 プレイヤー認証

**プレイヤーID管理**:
```typescript
function getPlayerId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem('nonaga_player_id');
  if (!id) {
    id = crypto.randomUUID();  // UUID v4
    localStorage.setItem('nonaga_player_id', id);
  }

  return id;
}
```

**特徴**:
- アカウント登録不要（匿名プレイ）
- ブラウザごとに一意のUUID
- localStorageクリアで新しいIDを取得

**セキュリティリスク**:
- ❌ なりすまし可能（UUID知られると）
- ❌ 複数デバイスで同じプレイヤーとして扱えない

**軽減策**:
- ゲームIDとプレイヤーIDの組み合わせで検証
- Lambda側でホスト/ゲストの固定チェック
- ゲームセッションは24時間で自動削除

### 1.2 API Key認証

**AppSync認証設定**:
```typescript
authorizationConfig: {
  defaultAuthorization: {
    authorizationType: appsync.AuthorizationType.API_KEY,
    apiKeyConfig: {
      expires: cdk.Expiration.after(cdk.Duration.days(365)),
    },
  },
},
```

**API Keyの管理**:
- **保存場所**: 環境変数（`APPSYNC_API_KEY`）
- **アクセス**: Next.js API Routesからのみ（サーバーサイド）
- **クライアント**: ブラウザに公開されない

**リクエストフロー**:
```
ブラウザ
  → Next.js API Route（公開エンドポイント）
    → AppSync（API Key認証、サーバー内部のみ）
      → DynamoDB / Lambda
```

**セキュリティ上の利点**:
- API Keyがブラウザに露出しない
- Next.js API Routesでレート制限・バリデーション可能

### 1.3 不正操作の防止

**Lambda側のバリデーション**:

```typescript
// 1. ゲーム状態取得
const game = await getGameFromDynamoDB(gameId);

// 2. ステータス確認
if (game.status !== 'PLAYING') {
  throw new Error('Game is not active');
}

// 3. フェーズ確認
if (game.phase !== 'move_token') {
  throw new Error('Wrong phase');
}

// 4. プレイヤー認証
const playerColor = getPlayerColor(game, playerId);
if (!playerColor) {
  throw new Error('Player not in game');
}

// 5. ターン確認
if (game.turn !== playerColor) {
  throw new Error('Not your turn');
}

// 6. コマ所有権確認
const piece = game.pieces.find(p => p.id === pieceId);
if (piece.player !== playerColor) {
  throw new Error('Not your piece');
}

// 7. 移動可能性確認
const isValid = isValidPieceMove(piece, toQ, toR, game.tiles, game.pieces);
if (!isValid) {
  throw new Error('Invalid move');
}
```

**二重検証**:
- **クライアント**: UX最適化（即座にエラー表示）
- **サーバー**: セキュリティ（不正操作を確実にブロック）

### 1.4 XSS対策

**Reactの自動エスケープ**:
```tsx
// 安全（自動エスケープ）
<div>{userInput}</div>

// 危険（使用しない）
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**ユーザー入力の扱い**:
- ルームコード: 数字のみ許可（正規表現で検証）
- プレイヤーID: UUID v4（固定フォーマット）
- ゲームID: UUID v4（固定フォーマット）

### 1.5 CSRF対策

**SameSite Cookie設定**:
```typescript
// Next.js の default 設定
cookies().set('name', 'value', {
  sameSite: 'lax',  // CSRF攻撃を防ぐ
});
```

**HTTPS必須**:
- 本番環境はAmplify Hosting（HTTPS強制）
- Cookie の Secure フラグ有効

### 1.6 DDoS対策

**AppSync/Lambda**:
- AWSのDDoS Protection（AWS Shield Standard）
- Lambda同時実行数制限（デフォルト1000）

**Amplify Hosting**:
- CloudFront CDN（DDoS Protection標準装備）

**将来的な対策**:
- WAF（Web Application Firewall）設定
- レート制限（API Gateway Throttling）

---

## 2. UI/UX仕様

### 2.1 レスポンシブデザイン

**ブレークポイント**:
```css
/* スマホ */
@media (max-width: 640px) {
  /* HEX_SIZE: 28px */
}

/* タブレット */
@media (min-width: 641px) and (max-width: 1024px) {
  /* HEX_SIZE: 34px */
}

/* デスクトップ */
@media (min-width: 1025px) {
  /* HEX_SIZE: 38px */
}
```

**SVGのViewBox自動調整**:
```typescript
const { minX, minY, maxX, maxY } = calculateViewBounds(tiles);
const padding = HEX_SIZE * 2;

<svg
  viewBox={`${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`}
  width="100%"
  height="100%"
>
```

### 2.2 アニメーション仕様

**コマ移動アニメーション**:
```css
.piece {
  transition: transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

**タイル移動アニメーション**:
```css
.tile {
  transition: transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

**勝利エフェクト**:
```css
@keyframes victory-glow {
  0%, 100% {
    filter: drop-shadow(0 0 8px gold);
  }
  50% {
    filter: drop-shadow(0 0 16px gold);
  }
}

.victory-piece {
  animation: victory-glow 1s ease-in-out infinite;
}
```

**ホバーエフェクト**:
```css
.tile:hover, .piece:hover {
  filter: brightness(1.2);
  cursor: pointer;
}

.valid-destination {
  fill: rgba(255, 215, 0, 0.3);
  stroke: gold;
  stroke-width: 2;
  animation: pulse 1s ease-in-out infinite;
}
```

### 2.3 多言語対応（i18n）

**言語管理**:
```typescript
type Lang = 'ja' | 'en';

const I18N = {
  ja: { /* 日本語文字列 */ },
  en: { /* 英語文字列 */ },
};

// localStorage + document.documentElement.lang で永続化
const lang = localStorage.getItem('nonaga_lang') || document.documentElement.lang || 'ja';
```

**言語切り替えUI**:
```tsx
<button onClick={toggleLang}>
  {lang === 'ja' ? 'EN' : 'JP'}
</button>
```

**対応文字列**:
- ゲームタイトル
- ボタンラベル（「ゲーム作成」「参加」など）
- ステータスメッセージ（「あなたのターンです」など）
- エラーメッセージ
- 勝利メッセージ
- アバウトページ

### 2.4 アクセシビリティ

**キーボード操作**:
- タブキーでフォーカス移動
- Enterキーで選択

**スクリーンリーダー対応**:
```tsx
<svg aria-label="ゲームボード">
  <circle aria-label={`${color}のコマ、位置 ${q},${r}`} />
  <polygon aria-label={`タイル、位置 ${q},${r}`} />
</svg>
```

**色覚異常対応**:
- 赤: `#e74c3c`（明るい赤）
- 青: `#3498db`（明るい青）
- 十分なコントラスト比（WCAG AA準拠）

**将来の改善**:
- ハイコントラストモード
- フォントサイズ調整
- モーション削減オプション

---

## 3. パフォーマンス要件

### 3.1 読み込み時間目標

| 指標 | 目標値 |
|------|-------|
| First Contentful Paint (FCP) | < 1.5秒 |
| Largest Contentful Paint (LCP) | < 2.5秒 |
| Time to Interactive (TTI) | < 3.0秒 |
| Cumulative Layout Shift (CLS) | < 0.1 |

### 3.2 Next.js最適化

**Standalone Output**:
```javascript
// next.config.js
module.exports = {
  output: 'standalone',  // 最小限のランタイム
};
```

**自動コード分割**:
- ページごとに自動分割（App Router）
- Dynamic Import未使用（ページ数が少ない）

### 3.3 DynamoDB性能

**読み取り性能**:
- GetItem: ~10ms
- Query (GSI): ~20ms

**書き込み性能**:
- PutItem: ~15ms
- UpdateItem: ~15ms

**スループット**:
- PAY_PER_REQUEST: 自動スケーリング
- バーストキャパシティ: 最大40,000 RCU/WCU

### 3.4 Lambda性能

**Cold Start**:
- メモリ256MB: ~500ms
- メモリ512MB: ~300ms（現在256MBで運用中）

**Warm実行**:
- 平均: ~50ms
- P99: ~200ms

**最適化**:
- esbuild バンドル（サイズ削減）
- 環境変数キャッシュ
- DynamoDB DocumentClient再利用

### 3.5 ポーリングのパフォーマンス影響

**リクエスト量**:
- 1ユーザー: 1秒に1回
- 1000ユーザー: 1000 QPS
- コスト: ~$5/月（Lambda + DynamoDB + AppSync）

**最適化**:
- `updatedAt` 比較でReact再レンダリング削減
- アニメーション中はポーリングスキップ
- ABANDONED時は停止

---

## 4. エラーハンドリング

### 4.1 クライアント側エラー処理

**API エラーハンドリング**:
```typescript
try {
  const res = await fetch(`/api/game/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Unknown error');
  }

  const game = await res.json();
  setGame(game);
} catch (err) {
  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError('Unknown error');
  }

  // ロールバック
  setGame(previousGame);
}
```

**ネットワークエラー**:
```typescript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
}
```

**エラー表示**:
```tsx
{error && (
  <div className="error-banner">
    <p>{error}</p>
    <button onClick={() => setError(null)}>閉じる</button>
  </div>
)}
```

### 4.2 サーバー側エラー処理

**Lambda エラーレスポンス**:
```typescript
try {
  // ゲームロジック実行
  const updatedGame = await processMove(input);
  return updatedGame;
} catch (err) {
  console.error('Move error:', err);

  if (err.message === 'Not your turn') {
    throw new Error('Not your turn');  // 400 Bad Request
  }

  if (err.message === 'Invalid move') {
    throw new Error('Invalid move');  // 400 Bad Request
  }

  throw new Error('Internal server error');  // 500
}
```

**DynamoDB エラー**:
```typescript
try {
  await docClient.send(new UpdateCommand({ /* ... */ }));
} catch (err) {
  if (err.name === 'ConditionalCheckFailedException') {
    throw new Error('Game state changed');
  }

  if (err.name === 'ResourceNotFoundException') {
    throw new Error('Game not found');
  }

  throw err;
}
```

### 4.3 エラーメッセージ一覧

| エラー | 表示メッセージ（日本語） | 表示メッセージ（英語） |
|-------|------------------------|----------------------|
| ゲーム未発見 | ゲームが見つかりません | Game not found |
| 無効な移動 | 無効な移動です | Invalid move |
| 他人のターン | あなたのターンではありません | Not your turn |
| 他人のコマ | あなたのコマではありません | Not your piece |
| フェーズエラー | この操作はできません | Cannot perform this action now |
| 連結性エラー | 盤面が分断されます | Board must remain connected |
| ネットワークエラー | 接続に失敗しました | Connection failed |

---

## 5. モニタリング・ロギング

### 5.1 AppSync

**X-Rayトレーシング**:
- 有効化済み（`xrayEnabled: true`）
- リクエストごとのトレース
- レイテンシー・エラー分析

**CloudWatch Logs**:
```typescript
logConfig: {
  fieldLogLevel: appsync.FieldLogLevel.ERROR,
}
```

**ログ内容**:
- エラーログのみ（コスト最適化）
- GraphQL リクエスト・レスポンス
- Resolver実行時間

### 5.2 Lambda

**CloudWatch Logs**:
- 自動ロギング（`console.log`, `console.error`）
- ログ保持期間: 無期限（デフォルト）

**カスタムメトリクス**:
```typescript
console.log('Move executed', {
  gameId,
  playerId,
  pieceId,
  duration: Date.now() - startTime,
});
```

**X-Rayトレーシング**:
- AppSync経由で自動トレース
- DynamoDB呼び出しの可視化

### 5.3 DynamoDB

**CloudWatch メトリクス**:
- `ConsumedReadCapacityUnits`
- `ConsumedWriteCapacityUnits`
- `UserErrors`（バリデーションエラー）
- `SystemErrors`

**アラーム設定（推奨）**:
- `SystemErrors > 10` → 通知
- `UserErrors > 100` → 調査

### 5.4 Amplify Hosting

**ビルドログ**:
- Amplify Console で確認
- ビルド成功/失敗通知

**アクセスログ**:
- CloudFront アクセスログ（オプション）
- リクエスト数・エラー率

### 5.5 将来的な監視項目

**アプリケーションメトリクス**:
- アクティブゲーム数（DynamoDB Count）
- 平均ゲーム時間
- ルームコード利用率
- エラー発生率

**ユーザーメトリクス**:
- DAU/MAU
- ゲーム完了率
- リマッチ率

**インフラメトリクス**:
- Lambda Cold Start頻度
- DynamoDB スロットリング
- AppSync レスポンスタイム

---

## 6. 制約事項・既知の問題

### 6.1 技術的制約

1. **ポーリング遅延**
   - 最大1秒の状態同期遅延
   - リアルタイム性が求められる場合は不適

2. **プレイヤー認証の脆弱性**
   - UUIDベースの匿名認証
   - なりすまし可能（UUID漏洩時）

3. **DynamoDB TTL の遅延**
   - 削除タイミングは48時間以内（通常数時間）
   - 厳密に24時間で削除されるわけではない

4. **AppSync Subscription未使用**
   - スキーマ定義は存在するが実装なし
   - 将来的にリアルタイム化する場合は移行が必要

5. **Lambda Cold Start**
   - 初回リクエストで500ms程度の遅延
   - Provisioned Concurrency未設定（コスト最適化優先）

### 6.2 ゲーム仕様の制約

1. **観戦モード未実装**
   - プレイヤー以外は閲覧不可

2. **リプレイ機能なし**
   - 過去のゲームを見返せない

3. **ランキング機能なし**
   - 勝敗記録の保存なし

4. **チャット機能なし**
   - プレイヤー間のコミュニケーション手段なし

### 6.3 既知の問題

1. **ブラウザバック時の挙動**
   - ゲーム画面からバックすると状態が不整合になる可能性
   - 対策: ポーリングで自動修復

2. **複数タブで同時プレイ**
   - 同じプレイヤーIDで複数タブを開くと状態競合
   - 対策: lastUpdateRefで最新状態に収束

3. **スマホ横画面対応**
   - 縦画面推奨
   - 横画面でレイアウト崩れの可能性

4. **IE11非対応**
   - ES2020構文使用（Optional Chaining等）
   - モダンブラウザのみサポート

### 6.4 スケーラビリティの限界

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

---

## 7. 今後の拡張性

### 7.1 短期的な改善（3ヶ月以内）

1. **観戦モード**
   - プレイヤー以外がゲームを閲覧可能
   - 実装: `spectatorIds` 配列追加

2. **リマッチ通知**
   - 相手がリマッチリクエストを送ったことを通知
   - 実装: `rematchRequestedBy` フィールド追加

3. **ゲームタイマー**
   - ターン制限時間（例: 60秒）
   - 実装: `turnStartedAt` フィールド + Lambda定期実行

4. **エラー改善**
   - より詳細なエラーメッセージ
   - エラーログ収集・分析

### 7.2 中期的な機能追加（6ヶ月以内）

1. **ユーザーアカウント**
   - メールアドレスログイン
   - 実装: Amazon Cognito統合

2. **フレンド機能**
   - フレンドリスト
   - オンライン状態表示
   - 実装: DynamoDB追加テーブル

3. **ランキング**
   - 勝率・勝利数ランキング
   - 実装: DynamoDB GSI + 集計Lambda

4. **リプレイ保存**
   - 過去のゲームを再生
   - 実装: S3 に棋譜保存

5. **チャット機能**
   - ゲーム内簡易チャット
   - 実装: AppSync Subscription

### 7.3 長期的な展望（1年以内）

1. **カスタムルール**
   - タイル数・コマ数変更
   - 勝利条件カスタマイズ

2. **トーナメントモード**
   - 複数プレイヤーのトーナメント
   - 実装: ステートマシン（Step Functions）

3. **モバイルアプリ**
   - React Native版
   - プッシュ通知対応

4. **AI強化**
   - 機械学習ベースのAI
   - 実装: SageMaker + Lambda

5. **リアルタイム化**
   - WebSocketによる即座の状態同期
   - 実装: AppSync Subscription本格導入

### 7.4 技術的改善

1. **パフォーマンス最適化**
   - Lambda Provisioned Concurrency（ピーク時のみ）
   - DynamoDB DAX（キャッシュ）
   - Next.js ISR（Incremental Static Regeneration）

2. **テスト強化**
   - Unitテスト（Jest）
   - E2Eテスト（Playwright）
   - 負荷テスト（Artillery）

3. **監視強化**
   - カスタムダッシュボード（CloudWatch Dashboard）
   - エラー通知（SNS + Email）
   - アラート設定（CloudWatch Alarms）

4. **コスト最適化**
   - Lambda メモリサイズ調整
   - DynamoDB TTL による自動削除の徹底
   - CloudFront キャッシュ最適化

---

## 付録: 用語集

| 用語 | 説明 |
|------|------|
| 軸座標系（Axial Coordinates） | 六角形グリッドを2次元座標(q, r)で表現する座標系 |
| スライド移動 | コマが直線方向に障害物にぶつかるまで進む移動方式 |
| 連結性チェック | タイル移動後に全タイルが連結しているかBFSで検証 |
| ルームコード | 6桁の数字によるマッチングコード |
| ポーリング | 定期的にサーバーに状態を問い合わせる方式 |
| 楽観的UI更新 | サーバー検証前に画面を更新し、後で修正する手法 |
| TTL（Time To Live） | レコードの有効期限、期限切れで自動削除 |
| GSI（Global Secondary Index） | DynamoDBの追加インデックス |
| PAY_PER_REQUEST | DynamoDBのオンデマンド課金モード |
| Cold Start | Lambda関数の初回実行時の初期化遅延 |
| Standalone Output | Next.jsの最小ランタイム出力モード |

---

## 参考リンク

**技術ドキュメント**:
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)

**六角座標系**:
- [Hexagonal Grids (Red Blob Games)](https://www.redblobgames.com/grids/hexagons/)

**NONAGAプロジェクト**:
- GitHub: `https://github.com/Yuuga2001/nonaga`
- 本番URL: `https://nonaga.riverapp.jp/`

---

## 関連ドキュメント

- [アーキテクチャ設計](./ARCHITECTURE.md)
- [インフラ構成詳細](./INFRASTRUCTURE.md)
- [ゲームロジック仕様](./GAME_LOGIC.md)
- [API仕様](./API_REFERENCE.md)
- [デプロイメント](./DEPLOYMENT.md)
