// Types
export interface Tile {
  q: number;
  r: number;
}

export interface Piece {
  id: string;
  player: 'red' | 'blue';
  q: number;
  r: number;
}

export type GamePhase = 'waiting' | 'move_token' | 'move_tile' | 'ended';
export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'ABANDONED';
export type PlayerColor = 'red' | 'blue';

export interface GameSession {
  gameId: string;
  status: GameStatus;
  hostPlayerId: string;
  guestPlayerId?: string;
  hostColor: PlayerColor;
  tiles: Tile[];
  pieces: Piece[];
  turn: PlayerColor;
  phase: GamePhase;
  winner?: PlayerColor;
  victoryLine?: string[];
  lastMoveAt?: string;
  createdAt: string;
  updatedAt: string;
  ttl: number;
}

// Constants
export const HEX_SIZE = 38;

export const DIRECTIONS: Tile[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const INITIAL_TILES: Tile[] = [
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 2, r: 0 },
  { q: 2, r: -1 },
  { q: 2, r: -2 },
  { q: 1, r: -2 },
  { q: 0, r: -2 },
  { q: -1, r: -1 },
  { q: -2, r: 0 },
  { q: -2, r: 1 },
  { q: -2, r: 2 },
  { q: -1, r: 2 },
  { q: 0, r: 2 },
  { q: 1, r: 1 },
];

export const INITIAL_PIECES: Piece[] = [
  { id: 'r1', player: 'red', q: 2, r: -2 },
  { id: 'b1', player: 'blue', q: 2, r: 0 },
  { id: 'r2', player: 'red', q: 0, r: 2 },
  { id: 'b2', player: 'blue', q: -2, r: 2 },
  { id: 'r3', player: 'red', q: -2, r: 0 },
  { id: 'b3', player: 'blue', q: 0, r: -2 },
];

// Helper functions
export function coordsKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  return {
    x: HEX_SIZE * ((3 / 2) * q),
    y: HEX_SIZE * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r),
  };
}

export function isAdjacent(a: Tile, b: Tile): boolean {
  return DIRECTIONS.some((d) => a.q + d.q === b.q && a.r + d.r === b.r);
}

export function getVictoryCoords(
  pieces: Piece[],
  player: PlayerColor
): string[] | null {
  const playerPieces = pieces.filter((p) => p.player === player);
  if (playerPieces.length !== 3) return null;

  const [p1, p2, p3] = playerPieces;
  const adj12 = isAdjacent(p1, p2);
  const adj23 = isAdjacent(p2, p3);
  const adj13 = isAdjacent(p1, p3);

  const adjCount = [adj12, adj23, adj13].filter(Boolean).length;
  if (adjCount >= 2) {
    return playerPieces.map((p) => coordsKey(p.q, p.r));
  }
  return null;
}

export function getSlideDestinations(
  piece: Piece,
  tiles: Tile[],
  pieces: Piece[]
): Tile[] {
  const tileSet = new Set(tiles.map((t) => coordsKey(t.q, t.r)));
  const pieceMap = new Map(pieces.map((p) => [coordsKey(p.q, p.r), p]));

  const destinations: Tile[] = [];

  for (const dir of DIRECTIONS) {
    let q = piece.q;
    let r = piece.r;
    let lastValid: Tile | null = null;

    while (true) {
      const nextQ = q + dir.q;
      const nextR = r + dir.r;
      const nextKey = coordsKey(nextQ, nextR);

      if (!tileSet.has(nextKey)) break;
      if (pieceMap.has(nextKey)) break;

      q = nextQ;
      r = nextR;
      lastValid = { q, r };
    }

    if (lastValid && (lastValid.q !== piece.q || lastValid.r !== piece.r)) {
      destinations.push(lastValid);
    }
  }

  return destinations;
}

export function isBoardConnected(
  tiles: Tile[],
  excludeIndex?: number
): boolean {
  const filteredTiles =
    excludeIndex !== undefined
      ? tiles.filter((_, i) => i !== excludeIndex)
      : tiles;

  if (filteredTiles.length === 0) return true;

  const tileSet = new Set(filteredTiles.map((t) => coordsKey(t.q, t.r)));
  const visited = new Set<string>();
  const queue: Tile[] = [filteredTiles[0]];
  visited.add(coordsKey(filteredTiles[0].q, filteredTiles[0].r));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dir of DIRECTIONS) {
      const neighborKey = coordsKey(current.q + dir.q, current.r + dir.r);
      if (tileSet.has(neighborKey) && !visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({ q: current.q + dir.q, r: current.r + dir.r });
      }
    }
  }

  return visited.size === filteredTiles.length;
}

export function getValidTileDestinations(
  selectedIndex: number,
  tiles: Tile[]
): Tile[] {
  const remaining = tiles.filter((_, i) => i !== selectedIndex);
  const candidates = new Map<string, { q: number; r: number; count: number }>();

  // Find all positions adjacent to remaining tiles
  remaining.forEach((t) => {
    DIRECTIONS.forEach((d) => {
      const nQ = t.q + d.q;
      const nR = t.r + d.r;
      const key = coordsKey(nQ, nR);

      // Skip if already occupied by a tile
      if (
        remaining.some((rt) => rt.q === nQ && rt.r === nR) ||
        (tiles[selectedIndex].q === nQ && tiles[selectedIndex].r === nR)
      ) {
        return;
      }

      const existing = candidates.get(key);
      if (existing) {
        existing.count++;
      } else {
        candidates.set(key, { q: nQ, r: nR, count: 1 });
      }
    });
  });

  // Filter to positions adjacent to at least 2 tiles
  return Array.from(candidates.values())
    .filter((c) => c.count >= 2)
    .map(({ q, r }) => ({ q, r }));
}

export function getPlayerColor(
  game: GameSession,
  playerId: string
): PlayerColor | null {
  if (game.hostPlayerId === playerId) {
    return game.hostColor;
  }
  if (game.guestPlayerId === playerId) {
    return game.hostColor === 'red' ? 'blue' : 'red';
  }
  return null;
}

export function calculateViewBounds(tiles: Tile[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const padding = 60;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  tiles.forEach((t) => {
    const { x, y } = hexToPixel(t.q, t.r);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2,
  };
}

// i18n strings
export const I18N = {
  ja: {
    onlineTitle: 'オンライン対戦',
    createGame: 'ゲームを作成',
    creating: '作成中...',
    waitingForOpponent: '対戦相手を待っています...',
    shareUrl: 'このURLを友達に共有:',
    copyUrl: 'URLをコピー',
    copied: 'コピーしました!',
    joining: '参加中...',
    joinGame: '参加する',
    gameNotFound: 'ゲームが見つかりません',
    gameAlreadyStarted: 'このゲームは既に開始されています',
    yourTurn: 'あなたの番',
    opponentTurn: '相手の番',
    youWin: 'あなたの勝ち!',
    opponentWin: '相手の勝ち!',
    playAgain: 'もう一度あそぶ',
    backToLobby: 'ロビーに戻る',
    phaseMoveToken: '1. コマを滑らせる',
    phaseMoveTile: '2. タイルを動かす',
    goal: '自分のコマを 3つ連結 させれば勝ち!',
    goalHint: 'クリックで詳しい説明へ',
    slideToEdge: '端までコマを滑らせる',
    moveEmptyTile: '空きタイルを移動する',
    rulesLabel: 'ゲームルール',
    boardLabel: 'NONAGA ゲームボード',
    boardSvgLabel: '六角形タイルとコマのゲームボード',
    alertBoardSplit: '盤面を分断できません',
    connectionError: '接続エラー',
    reconnecting: '再接続中...',
    localGame: 'ローカル対戦',
    you: 'あなた',
    opponent: '相手',
    playerRed: '赤',
    playerBlue: '青',
    abandoned: '対戦相手が退出しました',
  },
  en: {
    onlineTitle: 'Online Match',
    createGame: 'Create Game',
    creating: 'Creating...',
    waitingForOpponent: 'Waiting for opponent...',
    shareUrl: 'Share this URL with a friend:',
    copyUrl: 'Copy URL',
    copied: 'Copied!',
    joining: 'Joining...',
    joinGame: 'Join',
    gameNotFound: 'Game not found',
    gameAlreadyStarted: 'This game has already started',
    yourTurn: 'Your turn',
    opponentTurn: "Opponent's turn",
    youWin: 'You win!',
    opponentWin: 'Opponent wins!',
    playAgain: 'Play again',
    backToLobby: 'Back to lobby',
    phaseMoveToken: '1. Slide a piece',
    phaseMoveTile: '2. Move a tile',
    goal: 'Win by connecting your three pieces!',
    goalHint: 'Click for details',
    slideToEdge: 'Slide a piece to the edge',
    moveEmptyTile: 'Move an empty tile',
    rulesLabel: 'Rules',
    boardLabel: 'NONAGA game board',
    boardSvgLabel: 'Hex tiles and pieces board',
    alertBoardSplit: 'You cannot split the board.',
    connectionError: 'Connection error',
    reconnecting: 'Reconnecting...',
    localGame: 'Local Game',
    you: 'You',
    opponent: 'Opponent',
    playerRed: 'Red',
    playerBlue: 'Blue',
    abandoned: 'Opponent has left the game',
  },
};

export function getLang(): 'ja' | 'en' {
  const lang = (document.documentElement.lang || 'ja').toLowerCase();
  return lang.startsWith('en') ? 'en' : 'ja';
}

export function getStrings() {
  const lang = getLang();
  return I18N[lang];
}
