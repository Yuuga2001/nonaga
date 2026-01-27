# NONAGA（ノナガ）

盤面そのものを動かせる、六角形の新感覚ストラテジーボードゲーム。3つのコマを隣接させたら勝利です。ブラウザだけで、1人でもAI対戦でもすぐに遊べます。

- ローカル対戦（AI / 2人）: https://nonaga.riverapp.jp/online/local
- オンライン対戦: https://nonaga.riverapp.jp/online/

![NONAGA gameplay screenshot](public/screenshot.png)

---

## 特徴

- 盤面タイルを動かす独自ルールで、定番ボードゲームにない戦術性
- 6方向スライド移動で読み合いが生まれるテンポの良い対戦
- AI対戦モード / 2人対戦モードの切り替え
- **オンライン対戦対応（URLを共有するだけで友達と対戦可能）**
- **リマッチ機能（オンライン対戦で連続対戦可能）**
- レスポンシブ対応（PC / タブレット / スマホ）
- 日本語 / 英語対応

---

## 技術スタック

### オンライン版（メイン）
- Next.js 15 + React 19 + TypeScript
- AWS AppSync（GraphQL API）
- AWS DynamoDB（ゲームセッション管理）
- AWS CDK（Infrastructure as Code）

### ローカル版（レガシー）
- HTML / CSS / JavaScript
- React 18（CDN）
- Babel Standalone（CDN）
- SVGによる盤面描画

### インフラ
- AWS Amplify（ホスティング）
- GitHub Actions（CI/CD）

---

## セットアップ

### オンライン版（開発）

```bash
cd online
npm install
cp .env.example .env
# .envにAppSyncのエンドポイントとAPIキーを設定
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

### ローカル版（レガシー）

```bash
# 任意のHTTPサーバーで起動
python3 -m http.server 8000
# または
npx serve .
```

ブラウザで http://localhost:8000 にアクセスしてください。

---

## ファイル構成

```
nonaga/
├── index.html           # ローカル版（レガシー、単一ファイル）
├── app.jsx              # ローカル版ゲームロジック
├── app.css              # ローカル版スタイル
├── online/              # オンライン版（Next.js）
│   ├── app/
│   │   ├── layout.tsx, page.tsx    # ルートレイアウト + ロビー
│   │   ├── globals.css             # 全スタイル
│   │   ├── local/page.tsx          # ローカル対戦（AI/2人）
│   │   ├── about/page.tsx          # アバウトページ（日本語）
│   │   ├── en/about/page.tsx       # アバウトページ（英語）
│   │   ├── game/[gameId]/page.tsx  # オンラインゲーム
│   │   └── api/game/               # APIルート
│   ├── components/
│   │   ├── LobbyClient.tsx         # ロビーUI
│   │   ├── GameClient.tsx          # オンラインゲームロジック
│   │   ├── LocalGameClient.tsx     # ローカルゲームロジック
│   │   └── Board.tsx               # SVGボード描画
│   └── lib/
│       ├── gameLogic.ts            # 共通ゲームロジック
│       └── graphql.ts              # AppSyncクライアント
├── infra/               # AWS CDKインフラ
│   ├── lib/             # CDKスタック定義
│   ├── graphql/         # AppSyncスキーマ
│   └── lambda/          # Lambda関数
├── .github/workflows/   # GitHub Actions
└── amplify.yml          # Amplifyデプロイ設定
```

---

## インフラデプロイ

### 前提条件
- AWS CLI設定済み
- Node.js 20+

### CDKデプロイ

```bash
cd infra
npm install
npx cdk bootstrap  # 初回のみ
npx cdk deploy NonagaStack-Dev
```

### GitHub Actions設定

以下のSecretsをリポジトリに設定:
- `AWS_ROLE_ARN`: OIDC認証用IAMロールARN

環境変数（Amplify Consoleで設定）:
- `APPSYNC_ENDPOINT`: AppSync GraphQLエンドポイント
- `APPSYNC_API_KEY`: AppSync APIキー

---

## ライセンス

MIT License
