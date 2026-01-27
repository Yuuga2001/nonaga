# NONAGA 技術ドキュメント

NONAGAプロジェクトの技術仕様書へようこそ。このディレクトリには、システムの設計・実装・運用に関する詳細なドキュメントが含まれています。

バージョン: 2.0
最終更新: 2026-01-27

---

## 📚 ドキュメント一覧

### 1. [アーキテクチャ設計](./ARCHITECTURE.md)

**対象読者**: 全エンジニア、プロジェクトマネージャー

**内容**:
- システム概要・主要機能
- システム全体構成図
- データフロー図（ゲーム作成・参加・移動）
- データモデル詳細（六角座標系、ゲーム状態）
- スケーラビリティ設計

**読むべきタイミング**:
- プロジェクト参加時（最初に読む）
- システム全体像を理解したいとき
- データフロー を確認したいとき

---

### 2. [インフラ構成詳細](./INFRASTRUCTURE.md)

**対象読者**: バックエンドエンジニア、インフラエンジニア、DevOps

**内容**:
- AWS AppSync（GraphQL API）の詳細設定
- Amazon DynamoDB（テーブル設計、GSI、TTL）
- AWS Lambda（関数設定、処理フロー、Cold Start対策）
- AWS Amplify Hosting（ビルド、デプロイ）
- ネットワークフロー

**読むべきタイミング**:
- インフラの変更・追加時
- パフォーマンス調査時
- コスト最適化の検討時

**最重要セクション**:
- 2.2 DynamoDB属性定義
- 2.3 GSI（StatusIndex, RoomCodeIndex）
- 3.4 Lambda処理フロー例

---

### 3. [ゲームロジック仕様](./GAME_LOGIC.md)

**対象読者**: フロントエンドエンジニア、ゲームロジック担当者

**内容**:
- スライド移動アルゴリズム
- 連結性チェック（BFS）
- タイル配置ルール
- 勝利判定アルゴリズム
- AI評価関数（LocalGameClient）

**読むべきタイミング**:
- ゲームルールの実装・修正時
- バグ調査時
- AI改善時

**最重要セクション**:
- 1.2 スライド移動アルゴリズム
- 2.2 BFS（幅優先探索）アルゴリズム
- 4.2 勝利判定アルゴリズム

---

### 4. [API仕様](./API_REFERENCE.md)

**対象読者**: フロントエンドエンジニア、バックエンドエンジニア

**内容**:
- Next.js API Routes（全エンドポイント）
- GraphQL スキーマ
- リアルタイム同期設計（ポーリング）
- マッチメイキング仕様（ルームコード）

**読むべきタイミング**:
- API統合時
- クライアント・サーバー間の通信実装時
- エラーハンドリング実装時

**最重要セクション**:
- 1.5 コマ移動
- 1.6 タイル移動
- 3.2 ポーリング実装詳細
- 4.1 ルームコード生成

---

### 5. [デプロイメント](./DEPLOYMENT.md)

**対象読者**: DevOps、インフラエンジニア、全エンジニア

**内容**:
- CI/CDパイプライン（GitHub Actions）
- AWS Amplify Hosting設定
- 環境分離（Dev/Prod）
- ロールバック手順
- 環境変数管理

**読むべきタイミング**:
- 初回セットアップ時
- デプロイエラー発生時
- 新しい環境の追加時

**最重要セクション**:
- 1.1 インフラデプロイ（deploy-infra.yml）
- 2.1 amplify.yml設定
- 4. ロールバック手順

---

### 6. [運用・監視](./OPERATIONS.md)

**対象読者**: 全エンジニア、運用担当者

**内容**:
- 認証・セキュリティ
- UI/UX仕様（レスポンシブ、アニメーション、多言語）
- パフォーマンス要件
- エラーハンドリング
- モニタリング・ロギング
- 制約事項・既知の問題
- 今後の拡張性

**読むべきタイミング**:
- セキュリティレビュー時
- パフォーマンス改善時
- 運用トラブル発生時
- 機能拡張の計画時

**最重要セクション**:
- 1.3 不正操作の防止
- 4.3 エラーメッセージ一覧
- 6. 制約事項・既知の問題

---

## 🗂️ ドキュメント構成

```
docs/
├── README.md                # このファイル（全体ガイド）
├── ARCHITECTURE.md          # システム全体像・データモデル
├── INFRASTRUCTURE.md        # AWS詳細設計（最も詳しい）
├── GAME_LOGIC.md           # ゲームアルゴリズム
├── API_REFERENCE.md        # API仕様・同期・マッチング
├── DEPLOYMENT.md           # CI/CD・デプロイ手順
└── OPERATIONS.md           # 運用・監視・セキュリティ
```

---

## 🚀 クイックスタート

### 新規参加者向けの読む順序

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - システム全体像を理解
2. **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** - AWS構成を把握
3. **役割に応じて**:
   - フロント: [GAME_LOGIC.md](./GAME_LOGIC.md) → [API_REFERENCE.md](./API_REFERENCE.md)
   - バック: [API_REFERENCE.md](./API_REFERENCE.md) → [GAME_LOGIC.md](./GAME_LOGIC.md)
   - DevOps: [DEPLOYMENT.md](./DEPLOYMENT.md) → [OPERATIONS.md](./OPERATIONS.md)

### 役割別推奨ドキュメント

**フロントエンドエンジニア**:
- 必須: ARCHITECTURE.md, GAME_LOGIC.md, API_REFERENCE.md
- 推奨: OPERATIONS.md（UI/UX仕様）

**バックエンドエンジニア**:
- 必須: ARCHITECTURE.md, INFRASTRUCTURE.md, API_REFERENCE.md
- 推奨: GAME_LOGIC.md（バリデーション実装）

**インフラエンジニア / DevOps**:
- 必須: INFRASTRUCTURE.md, DEPLOYMENT.md, OPERATIONS.md
- 推奨: ARCHITECTURE.md

**プロジェクトマネージャー**:
- 必須: ARCHITECTURE.md, OPERATIONS.md（制約事項・拡張性）
- 推奨: 全ドキュメント（概要のみ）

---

## 🔍 よくある質問

### Q1: ゲームの勝利条件は？
→ [GAME_LOGIC.md - 4.1 勝利条件](./GAME_LOGIC.md#41-勝利条件)

### Q2: DynamoDBのテーブル設計は？
→ [INFRASTRUCTURE.md - 2.2 属性定義](./INFRASTRUCTURE.md#22-属性定義)

### Q3: ルームコードの生成方法は？
→ [API_REFERENCE.md - 4.1 ルームコード生成](./API_REFERENCE.md#41-ルームコード生成)

### Q4: ポーリングの実装方法は？
→ [API_REFERENCE.md - 3.2 ポーリング実装詳細](./API_REFERENCE.md#32-ポーリング実装詳細)

### Q5: デプロイ手順は？
→ [DEPLOYMENT.md - 開発ワークフロー](./DEPLOYMENT.md#開発ワークフロー)

### Q6: エラーメッセージの一覧は？
→ [OPERATIONS.md - 4.3 エラーメッセージ一覧](./OPERATIONS.md#43-エラーメッセージ一覧)

### Q7: スケーラビリティの限界は？
→ [OPERATIONS.md - 6.4 スケーラビリティの限界](./OPERATIONS.md#64-スケーラビリティの限界)

### Q8: 今後の拡張計画は？
→ [OPERATIONS.md - 7. 今後の拡張性](./OPERATIONS.md#7-今後の拡張性)

---

## 📝 ドキュメント更新ガイドライン

### 更新が必要なタイミング

- 新機能追加時
- アーキテクチャ変更時
- API仕様変更時
- パフォーマンス要件変更時
- 既知の問題が修正されたとき

### 更新手順

1. 該当ドキュメントを編集
2. 最終更新日を変更（各ファイルの先頭）
3. 変更履歴を記載（必要に応じて）
4. レビュー後、コミット

### ドキュメント品質基準

- ✅ コード例は動作確認済み
- ✅ 図は最新の構成を反映
- ✅ リンクは正しく機能する
- ✅ 技術用語は正確
- ✅ 日本語の文法・表記が統一されている

---

## 🔗 関連リンク

**プロジェクト**:
- GitHub: https://github.com/Yuuga2001/nonaga
- 本番URL: https://nonaga.riverapp.jp/

**開発者向けガイド**:
- [CLAUDE.md](../CLAUDE.md) - Claude Code向けクイックリファレンス
- [README.md](../README.md) - プロジェクト概要

**外部ドキュメント**:
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Hexagonal Grids (Red Blob Games)](https://www.redblobgames.com/grids/hexagons/)

---

**変更履歴**:
- 2026-01-27: 初版作成（6分割構成）
