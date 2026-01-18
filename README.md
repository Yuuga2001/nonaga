# NONAGA（ノナガ）

盤面そのものを動かせる、六角形の新感覚ストラテジーボードゲーム。3つのコマを隣接させたら勝利です。ブラウザだけで、1人でもAI対戦でもすぐに遊べます。

- プレイ: https://nonaga.riverapp.jp/

![NONAGA gameplay screenshot](public/screenshot.png)

---

## 特徴

- 盤面タイルを動かす独自ルールで、定番ボードゲームにない戦術性
- 6方向スライド移動で読み合いが生まれるテンポの良い対戦
- PvP / AI対戦モードの切り替え
- レスポンシブ対応（PC / タブレット / スマホ）
- ビルド不要、単一HTMLで即デプロイ

---

## 技術スタック

- HTML / CSS / JavaScript
- React 18（CDN）
- Babel Standalone（CDN）
- SVGによる盤面描画
- AWS Amplify（静的ホスティング）

---

## セットアップ

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
├── index.html       # ゲーム本体（ロジック込み）
├── public/          # 画像アセット（OGP / favicon など）
├── amplify.yaml     # AWS Amplifyデプロイ設定
└── README.md
```

---

## デプロイ

AWS Amplifyの静的ホスティングでそのまま公開できます。`amplify.yaml` を使用して全ファイルを配信します。

---

## ライセンス

MIT License
