// Server-side GraphQL client for AppSync
import { GameSession } from './gameLogic';

const APPSYNC_ENDPOINT = process.env.APPSYNC_ENDPOINT!;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY!;

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(APPSYNC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Queries
const GET_GAME = `
  query GetGame($gameId: ID!) {
    getGame(gameId: $gameId) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles { q r }
      pieces { id player q r }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      createdAt
      updatedAt
    }
  }
`;

const CREATE_GAME = `
  mutation CreateGame($hostPlayerId: String!) {
    createGame(hostPlayerId: $hostPlayerId) {
      gameId
      status
      hostPlayerId
      hostColor
      tiles { q r }
      pieces { id player q r }
      turn
      phase
      createdAt
      updatedAt
    }
  }
`;

const JOIN_GAME = `
  mutation JoinGame($gameId: ID!, $guestPlayerId: String!) {
    joinGame(gameId: $gameId, guestPlayerId: $guestPlayerId) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles { q r }
      pieces { id player q r }
      turn
      phase
      createdAt
      updatedAt
    }
  }
`;

const MOVE_PIECE = `
  mutation MovePiece($input: MovePieceInput!) {
    movePiece(input: $input) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles { q r }
      pieces { id player q r }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      updatedAt
    }
  }
`;

const MOVE_TILE = `
  mutation MoveTile($input: MoveTileInput!) {
    moveTile(input: $input) {
      gameId
      status
      hostPlayerId
      guestPlayerId
      hostColor
      tiles { q r }
      pieces { id player q r }
      turn
      phase
      winner
      victoryLine
      lastMoveAt
      updatedAt
    }
  }
`;

const ABANDON_GAME = `
  mutation AbandonGame($gameId: ID!, $playerId: String!) {
    abandonGame(gameId: $gameId, playerId: $playerId) {
      gameId
      status
      winner
      phase
      updatedAt
    }
  }
`;

// API functions
export async function getGame(gameId: string): Promise<GameSession | null> {
  try {
    const data = await graphqlRequest<{ getGame: GameSession | null }>(
      GET_GAME,
      { gameId }
    );
    return data.getGame;
  } catch (error) {
    console.error('getGame error:', error);
    return null;
  }
}

export async function createGame(hostPlayerId: string): Promise<GameSession> {
  const data = await graphqlRequest<{ createGame: GameSession }>(CREATE_GAME, {
    hostPlayerId,
  });
  return data.createGame;
}

export async function joinGame(
  gameId: string,
  guestPlayerId: string
): Promise<GameSession> {
  const data = await graphqlRequest<{ joinGame: GameSession }>(JOIN_GAME, {
    gameId,
    guestPlayerId,
  });
  return data.joinGame;
}

export async function movePiece(
  gameId: string,
  playerId: string,
  pieceId: string,
  toQ: number,
  toR: number
): Promise<GameSession> {
  const data = await graphqlRequest<{ movePiece: GameSession }>(MOVE_PIECE, {
    input: { gameId, playerId, pieceId, toQ, toR },
  });
  return data.movePiece;
}

export async function moveTile(
  gameId: string,
  playerId: string,
  tileIndex: number,
  toQ: number,
  toR: number
): Promise<GameSession> {
  const data = await graphqlRequest<{ moveTile: GameSession }>(MOVE_TILE, {
    input: { gameId, playerId, tileIndex, toQ, toR },
  });
  return data.moveTile;
}

export async function abandonGame(
  gameId: string,
  playerId: string
): Promise<GameSession> {
  const data = await graphqlRequest<{ abandonGame: GameSession }>(
    ABANDON_GAME,
    { gameId, playerId }
  );
  return data.abandonGame;
}
