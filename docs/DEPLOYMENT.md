# デプロイメント手順書

バージョン: 2.0
最終更新: 2026-01-27

---

## 目次

1. [CI/CDパイプライン](#1-cicdパイプライン)
2. [AWS Amplify Hosting](#2-aws-amplify-hosting)
3. [環境分離](#3-環境分離)
4. [ロールバック手順](#4-ロールバック手順)
5. [環境変数管理](#5-環境変数管理)

---

## 1. CI/CDパイプライン

### 1.1 インフラデプロイ（deploy-infra.yml）

#### トリガー

- `main` ブランチに `infra/**` の変更をpush
- 手動実行（`workflow_dispatch`、環境選択可能）

#### 処理フロー

```yaml
1. Checkout code
   ↓
2. Setup Node.js 20
   ↓
3. npm ci (infra/)
   ↓
4. Configure AWS credentials (OIDC)
   ↓
5. CDK Bootstrap（初回のみ）
   ↓
6. CDK Diff（変更確認）
   ↓
7. CDK Deploy
   - NonagaStack-Dev または NonagaStack-Prod
   - --outputs-file cdk-outputs.json
   ↓
8. Export outputs
   - GraphQLApiUrl
   - GraphQLApiKey
   ↓
9. GitHub Step Summary（結果表示）
```

#### ワークフロー定義

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infra/**'
      - '.github/workflows/deploy-infra.yml'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - prod

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ap-northeast-1

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: infra/package-lock.json

      - name: Install dependencies
        working-directory: infra
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK Bootstrap (if needed)
        working-directory: infra
        run: npx cdk bootstrap --require-approval never || true

      - name: CDK Diff
        working-directory: infra
        run: |
          STACK_NAME="NonagaStack-${{ github.event.inputs.environment == 'prod' && 'Prod' || 'Dev' }}"
          npx cdk diff $STACK_NAME || true

      - name: CDK Deploy
        working-directory: infra
        run: |
          STACK_NAME="NonagaStack-${{ github.event.inputs.environment == 'prod' && 'Prod' || 'Dev' }}"
          npx cdk deploy $STACK_NAME --require-approval never --outputs-file cdk-outputs.json

      - name: Export outputs
        id: outputs
        working-directory: infra
        run: |
          if [ -f cdk-outputs.json ]; then
            cat cdk-outputs.json

            GRAPHQL_URL=$(cat cdk-outputs.json | jq -r '.[] | .GraphQLApiUrl // empty' | head -1)
            API_KEY=$(cat cdk-outputs.json | jq -r '.[] | .GraphQLApiKey // empty' | head -1)

            echo "graphql_url=$GRAPHQL_URL" >> $GITHUB_OUTPUT
            echo "api_key=$API_KEY" >> $GITHUB_OUTPUT
          fi

      - name: Summary
        run: |
          echo "## Infrastructure Deployment Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Environment:** ${{ github.event.inputs.environment || 'dev' }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Region:** ${{ env.AWS_REGION }}" >> $GITHUB_STEP_SUMMARY
          echo "- **GraphQL URL:** ${{ steps.outputs.outputs.graphql_url }}" >> $GITHUB_STEP_SUMMARY
```

#### OIDC認証の設定

**メリット**:
- ✅ AWS認証キー不要（セキュア）
- ✅ 一時的な認証情報のみ使用
- ✅ IAMロールで権限管理

**IAMロール設定**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Yuuga2001/nonaga:*"
        }
      }
    }
  ]
}
```

### 1.2 フロントエンドデプロイ（deploy-frontend.yml）

#### トリガー

- `main` ブランチに `online/**` の変更をpush
- 手動実行

#### 処理フロー

```yaml
1. Checkout code
   ↓
2. Setup Node.js 20
   ↓
3. Configure AWS credentials (OIDC)
   ↓
4. Get CDK Outputs from CloudFormation
   - GraphQLApiUrl → APPSYNC_ENDPOINT
   - GraphQLApiKey → APPSYNC_API_KEY
   - フォールバック: GitHub Secrets
   ↓
5. npm ci (online/)
   ↓
6. npm run build
   - 環境変数を .env.production に書き込み
   - Next.js ビルド
   ↓
7. GitHub Step Summary（結果表示）
```

**注意**: Amplify Hostingが自動デプロイするため、GitHub Actionsはビルド検証のみ

#### ワークフロー定義

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'online/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ap-northeast-1

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: online/package-lock.json

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Get CDK Outputs
        id: cdk-outputs
        run: |
          STACK_NAME="nonaga-prod"

          ENDPOINT=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[?OutputKey==`GraphQLApiUrl`].OutputValue' \
            --output text 2>/dev/null || echo "")

          API_KEY=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[?OutputKey==`GraphQLApiKey`].OutputValue' \
            --output text 2>/dev/null || echo "")

          if [ -z "$ENDPOINT" ] || [ "$ENDPOINT" == "None" ]; then
            ENDPOINT="${{ secrets.VITE_APPSYNC_ENDPOINT }}"
          fi
          if [ -z "$API_KEY" ] || [ "$API_KEY" == "None" ]; then
            API_KEY="${{ secrets.VITE_APPSYNC_API_KEY }}"
          fi

          echo "endpoint=$ENDPOINT" >> $GITHUB_OUTPUT
          echo "api_key=$API_KEY" >> $GITHUB_OUTPUT

      - name: Install dependencies
        working-directory: online
        run: npm ci

      - name: Build
        working-directory: online
        env:
          APPSYNC_ENDPOINT: ${{ steps.cdk-outputs.outputs.endpoint }}
          APPSYNC_API_KEY: ${{ steps.cdk-outputs.outputs.api_key }}
        run: npm run build

      - name: Summary
        run: |
          echo "## Frontend Build Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Build Output:** online/.next/" >> $GITHUB_STEP_SUMMARY
          echo "- **GraphQL Endpoint:** ${{ steps.cdk-outputs.outputs.endpoint }}" >> $GITHUB_STEP_SUMMARY
```

---

## 2. AWS Amplify Hosting

### 2.1 設定（amplify.yml）

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
            - cat .env.production
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

### 2.2 環境変数設定

**Amplify Consoleで設定する変数**:
```
APPSYNC_ENDPOINT: https://xxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
APPSYNC_API_KEY: da2-xxxxxxxxxxxxxxxxxxxx
```

**設定手順**:
1. Amplify Console → 対象アプリを選択
2. 「環境変数」タブを開く
3. 変数を追加:
   - キー: `APPSYNC_ENDPOINT`、値: AppSyncのエンドポイント
   - キー: `APPSYNC_API_KEY`、値: AppSync APIキー

### 2.3 デプロイフロー

```
GitHub (main ブランチ)
   │ push
   ↓
Amplify Hosting（自動検知）
   │
   ├─ Git clone
   ├─ npm install
   ├─ npm run build
   ├─ .next/ をホスティング
   └─ CloudFront 配信
```

### 2.4 カスタムドメイン設定

**ドメイン**: `nonaga.riverapp.jp`

**設定手順**:
1. Amplify Console → 「ドメイン管理」
2. カスタムドメイン追加: `nonaga.riverapp.jp`
3. DNS設定（Route 53 または外部DNS）:
   - CNAME: `nonaga.riverapp.jp` → Amplifyのデフォルトドメイン

**HTTPS**:
- AWS Certificate Managerで自動証明書発行
- 自動更新

---

## 3. 環境分離

### 3.1 Dev環境

**用途**: 開発・テスト

**設定**:
```
スタック名: NonagaStack-Dev
テーブル名: NonagaGameSessions-NonagaStack-Dev
AppSync API: nonaga-api-NonagaStack-Dev
```

**デプロイコマンド**:
```bash
cd infra
npm run deploy:dev
```

### 3.2 Prod環境

**用途**: 本番運用

**設定**:
```
スタック名: NonagaStack-Prod
テーブル名: NonagaGameSessions-NonagaStack-Prod
AppSync API: nonaga-api-NonagaStack-Prod
```

**デプロイコマンド**:
```bash
cd infra
npm run deploy:prod
```

### 3.3 環境切り替え

**手動デプロイ**:
```bash
# Dev環境
cd infra
npm run deploy:dev

# Prod環境
cd infra
npm run deploy:prod
```

**GitHub Actions**:
```bash
# Dev環境（手動実行）
# Actions → Deploy Infrastructure → Run workflow → environment: dev

# Prod環境（手動実行）
# Actions → Deploy Infrastructure → Run workflow → environment: prod
```

---

## 4. ロールバック手順

### 4.1 インフラロールバック

**CloudFormationスタックのロールバック**:
```bash
aws cloudformation rollback-stack \
  --stack-name NonagaStack-Prod \
  --region ap-northeast-1
```

**CDKによる前バージョンへのデプロイ**:
```bash
# 1. 前のバージョンをチェックアウト
git checkout <previous-commit-hash>

# 2. デプロイ
cd infra
npm run deploy:prod

# 3. 確認後、mainブランチに戻る
git checkout main
```

### 4.2 フロントエンドロールバック

**Amplify Consoleからのロールバック**:
1. Amplify Console → 対象アプリ
2. 「デプロイ履歴」タブ
3. 前のビルドを選択 → 「再デプロイ」

**Gitによるロールバック**:
```bash
# 1. 前のコミットに戻す
git revert <commit-hash>

# 2. mainブランチにpush
git push origin main

# 3. Amplifyが自動デプロイ
```

### 4.3 データベースロールバック

**注意**: DynamoDBはPoint-in-Time Recovery（PITR）未設定

**重大なデータ破損時の対応**:
1. 手動バックアップから復元（存在する場合）
2. Lambda関数で不正なデータを修正
3. 最悪の場合: テーブル削除 → 再作成

**推奨**: 本番環境でPITRを有効化

```typescript
// CDKでPITR有効化
const gameTable = new dynamodb.Table(this, 'GameSessionsTable', {
  // ...
  pointInTimeRecovery: true,  // 追加
});
```

---

## 5. 環境変数管理

### 5.1 ローカル開発

**online/.env.local**（Git管理外）:
```bash
APPSYNC_ENDPOINT=https://xxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxxxxxxxxxxxxxxxxx
```

**作成手順**:
```bash
cd online
cat > .env.local <<EOF
APPSYNC_ENDPOINT=https://xxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxxxxxxxxxxxxxxxxx
EOF
```

**注意**:
- `.env.local` は `.gitignore` に含まれている
- 絶対にGitにコミットしない

### 5.2 本番環境

**設定場所**: Amplify Console

**取得方法**:
```bash
# CloudFormation Outputs から取得
aws cloudformation describe-stacks \
  --stack-name NonagaStack-Prod \
  --query 'Stacks[0].Outputs' \
  --region ap-northeast-1
```

**出力例**:
```json
[
  {
    "OutputKey": "GraphQLApiUrl",
    "OutputValue": "https://xxx.appsync-api.ap-northeast-1.amazonaws.com/graphql"
  },
  {
    "OutputKey": "GraphQLApiKey",
    "OutputValue": "da2-xxxxxxxxxxxxxxxxxxxx"
  }
]
```

### 5.3 セキュリティ

**API Keyの保護**:
- ✅ サーバーサイドのみで使用（Next.js API Routes）
- ✅ ブラウザに公開されない
- ❌ クライアントサイドで直接AppSyncを呼ばない

**環境変数の命名規則**:
```
APPSYNC_ENDPOINT   ✅ サーバーサイド専用
APPSYNC_API_KEY    ✅ サーバーサイド専用

NEXT_PUBLIC_*      ❌ クライアントに公開される（使用禁止）
```

---

## 開発ワークフロー

### 初回セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/Yuuga2001/nonaga.git
cd nonaga

# 2. オンライン版のセットアップ
cd online
npm install
cp .env.example .env.local  # （存在しないため手動作成）
# .env.local に環境変数を設定

# 3. 開発サーバー起動
npm run dev

# 4. インフラのセットアップ（必要な場合）
cd ../infra
npm install
npm run deploy:dev
```

### 機能追加フロー

```bash
# 1. 新しいブランチ作成
git checkout -b feature/new-feature

# 2. 開発
# ...コード変更...

# 3. ローカルテスト
cd online
npm run dev

# 4. ビルド確認
npm run build

# 5. コミット
git add .
git commit -m "Add new feature"

# 6. mainブランチにマージ
git push origin feature/new-feature
# → GitHub でPull Request作成 → レビュー → マージ

# 7. 自動デプロイ
# → GitHub Actions + Amplifyが自動デプロイ
```

---

## トラブルシューティング

### ビルドエラー

**症状**: Amplify Hostingでビルド失敗

**確認事項**:
1. 環境変数が正しく設定されているか
2. `package-lock.json` が最新か
3. Node.jsバージョンが20か

**解決方法**:
```bash
# ローカルでビルドテスト
cd online
npm run build

# エラーログ確認
# Amplify Console → ビルド履歴 → ログ確認
```

### デプロイ失敗

**症状**: CDK deployエラー

**確認事項**:
1. AWS認証情報が正しいか
2. CloudFormationスタックの状態
3. IAMロールの権限

**解決方法**:
```bash
# スタック状態確認
aws cloudformation describe-stacks \
  --stack-name NonagaStack-Prod \
  --region ap-northeast-1

# ロールバック
aws cloudformation rollback-stack \
  --stack-name NonagaStack-Prod \
  --region ap-northeast-1
```

---

## 関連ドキュメント

- [アーキテクチャ設計](./ARCHITECTURE.md)
- [インフラ構成詳細](./INFRASTRUCTURE.md)
- [ゲームロジック仕様](./GAME_LOGIC.md)
- [API仕様](./API_REFERENCE.md)
- [運用・監視](./OPERATIONS.md)
