# NONAGA（ノナガ）

六角形の盤面を操り、3つのコマを繋げて勝利を目指す2人対戦ゲーム

[![Play Now](https://img.shields.io/badge/🎮-今すぐプレイ-blue?style=for-the-badge)](https://main.d2sqhzibotcf4t.amplifyapp.com/)

---

## 🎯 ゲーム概要

**盤面自体が動く、新感覚の戦略ゲーム**

NONAGAは、コマを動かすだけでなく、盤面のタイル自体を動かせる独特なルールが特徴の戦略ゲームです。自分の3つのコマを隣接させた方が勝ち——シンプルなゴールと、奥深い戦術性が魅力です。

✨ **5分で理解、一生楽しめる**
⚡ **1ゲーム10分程度**
🧠 **相手の一手先を読む駆け引き**

---

## 📖 ルール

### 🎲 セットアップ

- **盤面**: 19枚の六角タイルを蜂の巣状に配置
- **コマ**: 赤・青それぞれ3個ずつ、交互に外周に配置

### 🏆 勝利条件

**自分の3つのコマが全て隣接したら勝ち**

隣接パターンは以下の3種類:
- 📏 **直線**: 3つが一直線
- 🔺 **三角形**: 3つが三角形に
- ✌️ **V字**: V字型に配置

### 🔄 ターンの流れ

毎ターン、以下の**2つのアクションを必ず実行**します：

#### ステップ1: コマを滑らせる 🎿

1. 自分のコマを1つ選択
2. 6方向（六角形の辺の方向）のいずれかをクリック
3. コマは**障害物にぶつかるまで滑り続けます**（途中で止まれません）
   - 障害物 = 他のコマ または 盤面の端

#### ステップ2: タイルを動かす 🔀

1. **コマが乗っていない空のタイル**を選択
2. 緑色でハイライトされた位置から移動先を選択

**⚠️ 制約条件**:
- 移動後のタイルは**2枚以上のタイルと隣接**していること
- タイル移動で**盤面を分断しない**こと（全タイルが繋がったまま）

### 💡 戦略のコツ

- 🎯 自分のコマを近づける配置
- 🚧 相手のコマの足場を奪う
- 🔮 先読みしたタイル配置
- ⚖️ 攻守のバランス

---

## 🖥️ 遊び方

### オンライン版（推奨）

ブラウザで即プレイ可能（インストール不要）:

🎮 **[今すぐプレイ](https://main.d2sqhzibotcf4t.amplifyapp.com/)**

### ローカル環境で起動

```bash
# 任意のHTTPサーバーで起動
python3 -m http.server 8000
# または
npx serve .
```

その後 http://localhost:8000 にアクセス

### 対応環境

- ✅ PC（Chrome, Firefox, Safari, Edge）
- ✅ スマートフォン（iOS Safari, Android Chrome）
- ✅ タブレット

---

## 🛠️ 技術仕様

### 実装方式

**単一HTMLファイルによるシンプル実装**

- **ファイル構成**: `index.html` 1ファイルのみ（22KB）
- **依存関係**: CDN経由でReact 18を読み込み
- **ビルド不要**: ブラウザで直接実行可能
- **描画エンジン**: SVG（六角形ポリゴン）
- **座標系**: 軸座標系（Axial Coordinates）`{q, r}`
- **状態管理**: React Hooks（useState, useMemo, useCallback）

### 主要技術

```html
<!DOCTYPE html>
<html>
  <!-- React 18 (CDN) -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react.dom.production.min.js"></script>

  <!-- Babel Standalone (JSX変換) -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- ゲームロジック（インライン） -->
  <script type="text/babel">
    // 全てのゲームロジックがここに
  </script>
</html>
```

### 実装済み機能

| 機能 | 実装状況 |
|------|---------|
| コマのスライド移動 | ✅ 6方向対応 |
| タイル移動制約チェック | ✅ BFSによる接続性検証 |
| 勝利判定 | ✅ リアルタイム判定 |
| アニメーション | ✅ スムーズな移動演出 |
| モバイル対応 | ✅ タッチ操作・レスポンシブ |
| リセット機能 | ✅ 即座に再戦可能 |

### コアアルゴリズム

#### 1. スライド移動（index.html:187-195）

コマが選択方向に障害物（他のコマまたは盤面端）まで滑る

```javascript
const slideInDirection = (q, r, dq, dr) => {
  let cq = q, cr = r;
  while (true) {
    const nq = cq + dq, nr = cr + dr;
    if (!tileMap.has(coordsKey(nq, nr))) break;
    if (pieceMap.has(coordsKey(nq, nr))) break;
    cq = nq; cr = nr;
  }
  return { q: cq, r: cr };
}
```

#### 2. 接続性チェック（index.html:198-207）

タイル移動後も盤面が繋がっているかBFSで検証

```javascript
const isBoardConnected = (tiles, excludeIndex) => {
  const temp = tiles.filter((_, i) => i !== excludeIndex);
  if (temp.length === 0) return true;
  const visited = new Set([coordsKey(temp[0].q, temp[0].r)]);
  const queue = [temp[0]];
  // BFS実装...
  return visited.size === temp.length;
}
```

#### 3. 勝利判定（index.html:152-158）

3つのコマのうち2組以上が隣接していればOK

```javascript
const checkWin = (player) => {
  const ps = pieces.filter(p => p.player === player);
  const adj01 = areAdjacent(ps[0].q, ps[0].r, ps[1].q, ps[1].r);
  const adj12 = areAdjacent(ps[1].q, ps[1].r, ps[2].q, ps[2].r);
  const adj20 = areAdjacent(ps[2].q, ps[2].r, ps[0].q, ps[0].r);
  return (adj01 && adj12) || (adj12 && adj20) || (adj20 && adj01);
}
```

---

## 🎨 UI/UX 特徴

- 🖱️ **クリック操作**: PC/タブレット
- 👆 **タップ操作**: スマートフォン
- 🌈 **色分けフィードバック**:
  - 赤/青の選択強調
  - 緑の移動可能先ハイライト
  - 黄色の自分のターン表示
- ✨ **アニメーション**:
  - コマ移動のスムーズな補間（cubic ease-out）
  - 勝利時の紙吹雪演出
- 📱 **レスポンシブ**:
  - 動的ビューポート対応（100dvh）
  - セーフエリア考慮（iOS notch対応）
  - スマホでのスクロール対策

---

## 📝 今後の拡張案

- [ ] Undo/Redo機能
- [ ] AI対戦モード（ミニマックス法）
- [ ] オンライン対戦（WebSocket）
- [ ] テーマ切り替え（ダークモード）
- [ ] タイマーモード
- [ ] 棋譜記録・再生機能

---

## 📚 開発者向け情報

### ファイル構造

```
nonaga/
├── index.html       # ゲーム本体（全てのコードを含む）
├── CLAUDE.md        # プロジェクト概要（Claude Code用）
├── README.md        # このファイル
└── amplify.yaml     # AWS Amplifyデプロイ設定
```

### デプロイ

AWS Amplifyで自動デプロイ:

```yaml
# amplify.yaml
version: 1
frontend:
  phases:
    build:
      commands:
        - echo "Static HTML deployment - no build required"
  artifacts:
    baseDirectory: .
    files:
      - index.html
```

### カスタマイズ

`index.html` を直接編集:

- **スタイル**: `<style>` タグ内のCSS（10-99行目）
- **ゲームロジック**: `<script type="text/babel">` 内のReactコード（103-325行目）
- **初期配置**: `INITIAL_TILES` と `INITIAL_PIECES` 定数

---

## 🙏 クレジット

- **ゲームデザイン**: オリジナル
- **実装**: React 18 + SVG
- **デプロイ**: AWS Amplify

---

## 📄 ライセンス

MIT License
