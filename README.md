<div align="center">
  <img src="public/apple-touch-icon.png" alt="NONAGA icon" width="96" height="96" />
  <h1>NONAGA（ノナガ）</h1>
</div>

盤面そのものを動かせる、六角形の新感覚ストラテジーボードゲーム。3つのコマを隣接させたら勝利です。ブラウザだけで、1人でもAI対戦でもすぐに遊べます。

<div align="center">
  <a href="https://nonaga.riverapp.jp">
    <img alt="今すぐプレイ" src="https://img.shields.io/badge/%E4%BB%8A%E3%81%99%E3%81%90%E3%83%97%E3%83%AC%E3%82%A4-%E2%86%92-22C55E?style=for-the-badge&logo=google-play&logoColor=white" />
  </a>
</div>

![NONAGA gameplay screenshot](public/screenshot.png)

---

## 特徴

- 盤面タイルを動かす独自ルールで、定番ボードゲームにない戦術性
- 6方向スライド移動で読み合いが生まれるテンポの良い対戦
- AI対戦モード / 2人対戦モードの切り替え
- **オンライン対戦対応（URL共有/ルーム番号で参加可能）**
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

ブラウザで http://localhost:3000 にアクセスしてください（ローカル対戦）。ロビーは http://localhost:3000/online です。

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
│   │   ├── layout.tsx, page.tsx    # ルートレイアウト + ローカル対戦
│   │   ├── globals.css             # 全スタイル
│   │   ├── local/page.tsx          # ローカル対戦（AI/2人）
│   │   ├── online/page.tsx         # ロビー
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
