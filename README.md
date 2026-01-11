# NONAGA（ノナガ）

六角形の盤面を操り、3つのコマを繋げて勝利を目指す2人対戦ゲーム

[![Play Now](https://img.shields.io/badge/🎮-今すぐプレイ-blue?style=for-the-badge)](https://ymacbookpro.github.io/nonaga/)

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

### オンライン版

ブラウザで即プレイ可能（インストール不要）:

```bash
# ローカルで動かす場合
python -m http.server 8000
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

### アーキテクチャ

**単一ファイルHTML実装**

```
index.html
├── React 18 (CDN)
├── SVG レンダリング
└── レスポンシブデザイン
```

- **フレームワーク**: React 18（production build via CDN）
- **描画エンジン**: SVG（六角形ポリゴン）
- **座標系**: 軸座標系（Axial Coordinates）`{q, r}`
- **状態管理**: React hooks（useState, useMemo）
- **アニメーション**: requestAnimationFrame（450ms cubic ease-out）

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

#### 1. スライド移動（[index.html:187-195](index.html#L187-L195)）

```javascript
// 選択方向に障害物まで滑る
while (true) {
  next = current + direction
  if (!tileExists(next) || pieceExists(next)) break
  current = next
}
```

#### 2. 接続性チェック（[index.html:198-208](index.html#L198-L208)）

```javascript
// タイル削除後も盤面が繋がっているか検証
removeTile(selectedTile)
visited = BFS(anyRemainingTile)
isValid = (visited.size === remainingTiles.length)
```

#### 3. 勝利判定（[index.html:152-158](index.html#L152-L158)）

```javascript
// 3つのコマのうち2組以上が隣接していればOK
isAdjacent(p1, p2) && isAdjacent(p2, p3) // 直線
isAdjacent(p1, p2) && isAdjacent(p1, p3) // V字
isAdjacent(p2, p3) && isAdjacent(p1, p3) // V字逆
```

### データ構造

```javascript
// 状態（React state）
tiles: Array<{q: number, r: number}>           // 19タイルの座標
pieces: Array<{id, player, q, r}>              // 6コマの情報
turn: 'red' | 'blue'                           // 現在の手番
phase: 'move_token' | 'move_tile'              // フェーズ
selectedId: string | number | null             // 選択中のID

// 派生状態（useMemo）
tileMap: Set<string>                           // "q,r"形式のキーSet
pieceMap: Map<string, Piece>                   // 座標→コマのMap
validDests: Array<{q, r}>                      // 移動可能先
```

---

## 🎨 UI/UX 特徴

- 🖱️ **クリック操作**: PC/タブレット
- 👆 **タップ操作**: スマートフォン
- 🌈 **色分けフィードバック**:
  - 赤/青の選択強調
  - 緑の移動可能先ハイライト
- ✨ **アニメーション**:
  - コマ移動のスムーズな補間
  - 勝利時の紙吹雪演出
- 📱 **レスポンシブ**:
  - 動的ビューポート対応（dvh）
  - セーフエリア考慮（iOS）

---

## 📝 今後の拡張案

- [ ] 対戦履歴の保存
- [ ] AI対戦モード（ミニマックス法）
- [ ] オンライン対戦（WebSocket）
- [ ] 手の巻き戻し機能（Undo）
- [ ] タイマーモード

