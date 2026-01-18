import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

// Types
interface Tile {
  q: number;
  r: number;
}

interface Piece {
  id: string;
  player: 'red' | 'blue';
  q: number;
  r: number;
}

interface GameSession {
  gameId: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'ABANDONED';
  hostPlayerId: string;
  guestPlayerId?: string;
  hostColor: 'red' | 'blue';
  tiles: Tile[];
  pieces: Piece[];
  turn: 'red' | 'blue';
  phase: 'waiting' | 'move_token' | 'move_tile' | 'ended';
  winner?: string;
  victoryLine?: string[];
  lastMoveAt?: string;
  createdAt: string;
  updatedAt: string;
  ttl: number;
}

// Hex directions
const DIRECTIONS: Tile[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

// Initial game state
const INITIAL_TILES: Tile[] = [
  { q: 0, r: 0 },
  { q: 1, r: 0 }, { q: -1, r: 0 },
  { q: 0, r: 1 }, { q: 0, r: -1 },
  { q: 1, r: -1 }, { q: -1, r: 1 },
  { q: 2, r: 0 }, { q: -2, r: 0 },
  { q: 0, r: 2 }, { q: 0, r: -2 },
  { q: 2, r: -1 }, { q: -2, r: 1 },
  { q: 1, r: 1 }, { q: -1, r: -1 },
  { q: 2, r: -2 }, { q: -2, r: 2 },
  { q: 1, r: -2 }, { q: -1, r: 2 },
];

const INITIAL_PIECES: Piece[] = [
  { id: 'r1', player: 'red', q: 2, r: -2 },
  { id: 'r2', player: 'red', q: 0, r: 2 },
  { id: 'r3', player: 'red', q: -2, r: 0 },
  { id: 'b1', player: 'blue', q: 2, r: 0 },
  { id: 'b2', player: 'blue', q: -2, r: 2 },
  { id: 'b3', player: 'blue', q: 0, r: -2 },
];

// Helper functions
function coordsKey(q: number, r: number): string {
  return `${q},${r}`;
}

function isAdjacent(a: Tile, b: Tile): boolean {
  return DIRECTIONS.some((d) => a.q + d.q === b.q && a.r + d.r === b.r);
}

function checkVictory(pieces: Piece[], player: 'red' | 'blue'): string[] | null {
  const playerPieces = pieces.filter((p) => p.player === player);
  if (playerPieces.length !== 3) return null;

  const [p1, p2, p3] = playerPieces;
  const adj12 = isAdjacent(p1, p2);
  const adj23 = isAdjacent(p2, p3);
  const adj13 = isAdjacent(p1, p3);

  // All 3 pieces must form a connected group (at least 2 adjacency pairs)
  const adjCount = [adj12, adj23, adj13].filter(Boolean).length;
  if (adjCount >= 2) {
    return playerPieces.map((p) => coordsKey(p.q, p.r));
  }
  return null;
}

function getSlideDestination(
  piece: Piece,
  direction: Tile,
  tiles: Tile[],
  pieces: Piece[]
): Tile | null {
  const tileSet = new Set(tiles.map((t) => coordsKey(t.q, t.r)));
  const pieceMap = new Map(pieces.map((p) => [coordsKey(p.q, p.r), p]));

  let q = piece.q;
  let r = piece.r;
  let lastValid: Tile | null = null;

  while (true) {
    const nextQ = q + direction.q;
    const nextR = r + direction.r;
    const nextKey = coordsKey(nextQ, nextR);

    // Check if tile exists
    if (!tileSet.has(nextKey)) {
      break;
    }

    // Check if occupied by another piece
    if (pieceMap.has(nextKey)) {
      break;
    }

    q = nextQ;
    r = nextR;
    lastValid = { q, r };
  }

  // Must have moved at least one space
  if (lastValid && (lastValid.q !== piece.q || lastValid.r !== piece.r)) {
    return lastValid;
  }
  return null;
}

function isValidPieceMove(
  piece: Piece,
  toQ: number,
  toR: number,
  tiles: Tile[],
  pieces: Piece[]
): boolean {
  // Check if destination is reachable by sliding in any direction
  for (const dir of DIRECTIONS) {
    const dest = getSlideDestination(piece, dir, tiles, pieces);
    if (dest && dest.q === toQ && dest.r === toR) {
      return true;
    }
  }
  return false;
}

function isBoardConnected(tiles: Tile[], excludeIndex?: number): boolean {
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

function countAdjacentTiles(q: number, r: number, tiles: Tile[]): number {
  const tileSet = new Set(tiles.map((t) => coordsKey(t.q, t.r)));
  return DIRECTIONS.filter((dir) =>
    tileSet.has(coordsKey(q + dir.q, r + dir.r))
  ).length;
}

function isValidTileMove(
  fromIndex: number,
  toQ: number,
  toR: number,
  tiles: Tile[],
  pieces: Piece[]
): boolean {
  const fromTile = tiles[fromIndex];
  if (!fromTile) return false;

  // Cannot move a tile with a piece on it
  const pieceOnTile = pieces.find(
    (p) => p.q === fromTile.q && p.r === fromTile.r
  );
  if (pieceOnTile) return false;

  // Destination must not already have a tile
  const tileSet = new Set(tiles.map((t) => coordsKey(t.q, t.r)));
  if (tileSet.has(coordsKey(toQ, toR))) return false;

  // Board must remain connected after removing the tile
  if (!isBoardConnected(tiles, fromIndex)) return false;

  // Destination must be adjacent to at least 2 existing tiles
  const tempTiles = tiles.filter((_, i) => i !== fromIndex);
  const adjacentCount = countAdjacentTiles(toQ, toR, tempTiles);
  if (adjacentCount < 2) return false;

  return true;
}

function getPlayerColor(
  game: GameSession,
  playerId: string
): 'red' | 'blue' | null {
  if (game.hostPlayerId === playerId) {
    return game.hostColor;
  }
  if (game.guestPlayerId === playerId) {
    return game.hostColor === 'red' ? 'blue' : 'red';
  }
  return null;
}

// AppSync event handler
interface AppSyncEvent {
  info: {
    fieldName: string;
  };
  arguments: Record<string, unknown>;
}

export async function handler(event: AppSyncEvent): Promise<GameSession> {
  const { fieldName } = event.info;
  const args = event.arguments;

  switch (fieldName) {
    case 'createGame':
      return createGame(args.hostPlayerId as string);
    case 'joinGame':
      return joinGame(args.gameId as string, args.guestPlayerId as string);
    case 'movePiece':
      return movePiece(args.input as {
        gameId: string;
        playerId: string;
        pieceId: string;
        toQ: number;
        toR: number;
      });
    case 'moveTile':
      return moveTile(args.input as {
        gameId: string;
        playerId: string;
        fromIndex: number;
        toQ: number;
        toR: number;
      });
    case 'abandonGame':
      return abandonGame(args.gameId as string, args.playerId as string);
    default:
      throw new Error(`Unknown field: ${fieldName}`);
  }
}

async function createGame(hostPlayerId: string): Promise<GameSession> {
  const gameId = crypto.randomUUID();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const hostColor: 'red' | 'blue' = Math.random() < 0.5 ? 'red' : 'blue';

  const game: GameSession = {
    gameId,
    status: 'WAITING',
    hostPlayerId,
    hostColor,
    tiles: [...INITIAL_TILES],
    pieces: [...INITIAL_PIECES],
    turn: 'red',
    phase: 'waiting',
    createdAt: now,
    updatedAt: now,
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: game,
    })
  );

  return game;
}

async function joinGame(
  gameId: string,
  guestPlayerId: string
): Promise<GameSession> {
  const now = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { gameId },
      UpdateExpression:
        'SET guestPlayerId = :guestPlayerId, #status = :status, phase = :phase, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':guestPlayerId': guestPlayerId,
        ':status': 'PLAYING',
        ':phase': 'move_token',
        ':updatedAt': now,
        ':waitingStatus': 'WAITING',
      },
      ConditionExpression: '#status = :waitingStatus',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as GameSession;
}

async function movePiece(input: {
  gameId: string;
  playerId: string;
  pieceId: string;
  toQ: number;
  toR: number;
}): Promise<GameSession> {
  // Get current game state
  const getResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { gameId: input.gameId },
    })
  );

  const game = getResult.Item as GameSession;
  if (!game) {
    throw new Error('Game not found');
  }

  // Validate game state
  if (game.status !== 'PLAYING') {
    throw new Error('Game is not in progress');
  }
  if (game.phase !== 'move_token') {
    throw new Error('Not in piece movement phase');
  }

  // Validate player turn
  const playerColor = getPlayerColor(game, input.playerId);
  if (!playerColor) {
    throw new Error('Player not in this game');
  }
  if (playerColor !== game.turn) {
    throw new Error('Not your turn');
  }

  // Find and validate piece
  const piece = game.pieces.find((p) => p.id === input.pieceId);
  if (!piece) {
    throw new Error('Piece not found');
  }
  if (piece.player !== playerColor) {
    throw new Error('Cannot move opponent piece');
  }

  // Validate move
  if (
    !isValidPieceMove(piece, input.toQ, input.toR, game.tiles, game.pieces)
  ) {
    throw new Error('Invalid move');
  }

  // Update piece position
  const updatedPieces = game.pieces.map((p) =>
    p.id === input.pieceId ? { ...p, q: input.toQ, r: input.toR } : p
  );

  // Check for victory
  const victoryLine = checkVictory(updatedPieces, playerColor);
  const now = new Date().toISOString();

  if (victoryLine) {
    // Game won
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { gameId: input.gameId },
        UpdateExpression:
          'SET pieces = :pieces, phase = :phase, winner = :winner, victoryLine = :victoryLine, #status = :status, lastMoveAt = :lastMoveAt, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pieces': updatedPieces,
          ':phase': 'ended',
          ':winner': playerColor,
          ':victoryLine': victoryLine,
          ':status': 'FINISHED',
          ':lastMoveAt': now,
          ':updatedAt': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as GameSession;
  }

  // Continue to tile movement phase
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { gameId: input.gameId },
      UpdateExpression:
        'SET pieces = :pieces, phase = :phase, lastMoveAt = :lastMoveAt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':pieces': updatedPieces,
        ':phase': 'move_tile',
        ':lastMoveAt': now,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as GameSession;
}

async function moveTile(input: {
  gameId: string;
  playerId: string;
  fromIndex: number;
  toQ: number;
  toR: number;
}): Promise<GameSession> {
  // Get current game state
  const getResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { gameId: input.gameId },
    })
  );

  const game = getResult.Item as GameSession;
  if (!game) {
    throw new Error('Game not found');
  }

  // Validate game state
  if (game.status !== 'PLAYING') {
    throw new Error('Game is not in progress');
  }
  if (game.phase !== 'move_tile') {
    throw new Error('Not in tile movement phase');
  }

  // Validate player turn
  const playerColor = getPlayerColor(game, input.playerId);
  if (!playerColor) {
    throw new Error('Player not in this game');
  }
  if (playerColor !== game.turn) {
    throw new Error('Not your turn');
  }

  // Validate tile move
  if (
    !isValidTileMove(
      input.fromIndex,
      input.toQ,
      input.toR,
      game.tiles,
      game.pieces
    )
  ) {
    throw new Error('Invalid tile move');
  }

  // Update tiles
  const updatedTiles = game.tiles.map((t, i) =>
    i === input.fromIndex ? { q: input.toQ, r: input.toR } : t
  );

  // Switch turn
  const nextTurn: 'red' | 'blue' = game.turn === 'red' ? 'blue' : 'red';
  const now = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { gameId: input.gameId },
      UpdateExpression:
        'SET tiles = :tiles, turn = :turn, phase = :phase, lastMoveAt = :lastMoveAt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':tiles': updatedTiles,
        ':turn': nextTurn,
        ':phase': 'move_token',
        ':lastMoveAt': now,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as GameSession;
}

async function abandonGame(
  gameId: string,
  playerId: string
): Promise<GameSession> {
  const now = new Date().toISOString();

  // Get current game to determine winner
  const getResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { gameId },
    })
  );

  const game = getResult.Item as GameSession;
  if (!game) {
    throw new Error('Game not found');
  }

  const playerColor = getPlayerColor(game, playerId);
  if (!playerColor) {
    throw new Error('Player not in this game');
  }

  // The opponent wins when a player abandons
  const winnerColor: 'red' | 'blue' = playerColor === 'red' ? 'blue' : 'red';

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { gameId },
      UpdateExpression:
        'SET #status = :status, winner = :winner, phase = :phase, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'ABANDONED',
        ':winner': winnerColor,
        ':phase': 'ended',
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as GameSession;
}
