# NONAGA（ノナガ）

盤面そのものを動かせる、六角形の新感覚ストラテジーボードゲーム。3つのコマを隣接させたら勝利です。ブラウザだけで、1人でもAI対戦でもすぐに遊べます。

- プレイ: https://nonaga.riverapp.jp/
- オンライン対戦: https://nonaga.riverapp.jp/online/

![NONAGA gameplay screenshot](public/screenshot.png)

---

## 特徴

- 盤面タイルを動かす独自ルールで、定番ボードゲームにない戦術性
- 6方向スライド移動で読み合いが生まれるテンポの良い対戦
- PvP / AI対戦モードの切り替え
- **オンライン対戦対応（URLを共有するだけで友達と対戦可能）**
- レスポンシブ対応（PC / タブレット / スマホ）

---

## 技術スタック

### ローカル/AI対戦（既存）
- HTML / CSS / JavaScript
- React 18（CDN）
- Babel Standalone（CDN）
- SVGによる盤面描画

### オンライン対戦（新規）
- React 18 + TypeScript + Vite
- AWS AppSync（GraphQL API + リアルタイムサブスクリプション）
- AWS DynamoDB（ゲームセッション管理）
- AWS CDK（Infrastructure as Code）

### インフラ
- AWS Amplify（静的ホスティング）
- GitHub Actions（CI/CD）

---

## セットアップ

### ローカル対戦/AI対戦

```bash
# 任意のHTTPサーバーで起動
python3 -m http.server 8000
# または
npx serve .
```

ブラウザで http://localhost:8000 にアクセスしてください。

### オンライン対戦（開発）

```bash
# フロントエンド
cd online
npm install
cp .env.example .env
# .envにAppSyncのエンドポイントとAPIキーを設定
npm run dev
```

ブラウザで http://localhost:5173/online にアクセスしてください。

---

## ファイル構成

```
nonaga/
├── index.html           # ローカル/AI対戦（単一ファイル）
├── app.jsx              # ゲームロジック
├── app.css              # スタイル
├── online/              # オンライン対戦フロントエンド
│   ├── src/
│   │   ├── components/  # Reactコンポーネント
│   │   ├── hooks/       # カスタムフック
│   │   ├── graphql/     # GraphQL操作
│   │   └── lib/         # ゲームロジック
│   └── package.json
├── infra/               # AWS CDKインフラ
│   ├── lib/             # CDKスタック定義
│   ├── graphql/         # AppSyncスキーマ
│   └── lambda/          # Lambda関数
├── .github/workflows/   # GitHub Actions
├── amplify.yaml         # Amplifyデプロイ設定
└── public/              # 画像アセット
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
- `VITE_APPSYNC_ENDPOINT`: AppSync GraphQLエンドポイント（フォールバック用）
- `VITE_APPSYNC_API_KEY`: AppSync APIキー（フォールバック用）

---

## ライセンス

MIT License
