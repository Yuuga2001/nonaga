import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameSession, PlayerColor } from '../lib/gameLogic';
import { getPlayerColor } from '../lib/gameLogic';
import { graphqlRequest, createSubscription } from '../lib/graphqlClient';
import * as operations from '../graphql/operations';

// Generate UUID with fallback for older browsers
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create player ID from localStorage
function getPlayerId(): string {
  const key = 'nonaga_player_id';
  let playerId = localStorage.getItem(key);
  if (!playerId) {
    playerId = generateUUID();
    localStorage.setItem(key, playerId);
  }
  return playerId;
}

interface UseOnlineGameResult {
  game: GameSession | null;
  playerId: string;
  myColor: PlayerColor | null;
  isMyTurn: boolean;
  loading: boolean;
  error: string | null;
  createNewGame: () => Promise<string | null>;
  joinExistingGame: (gameId: string) => Promise<boolean>;
  sendMovePiece: (pieceId: string, toQ: number, toR: number) => Promise<void>;
  sendMoveTile: (fromIndex: number, toQ: number, toR: number) => Promise<void>;
  abandonCurrentGame: () => Promise<void>;
}

export function useOnlineGame(gameId?: string): UseOnlineGameResult {
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const playerId = getPlayerId();
  const myColor = game ? getPlayerColor(game, playerId) : null;
  const isMyTurn = game?.status === 'PLAYING' && game?.turn === myColor;

  // Fetch game data
  const fetchGame = useCallback(async (id: string) => {
    try {
      const result = await graphqlRequest<{ getGame: GameSession }>(
        operations.getGame,
        { gameId: id }
      );
      if (result.getGame) {
        setGame(result.getGame);
      }
      return result.getGame;
    } catch (err) {
      console.error('Failed to fetch game:', err);
      setError('ゲームの取得に失敗しました');
      return null;
    }
  }, []);

  // Subscribe to game updates
  const subscribeToGame = useCallback((id: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = createSubscription(
      operations.onGameUpdated,
      { gameId: id },
      (data) => {
        const gameData = (data as { onGameUpdated: GameSession }).onGameUpdated;
        if (gameData) {
          setGame(gameData);
        }
      },
      (err) => {
        console.error('Subscription error:', err);
        setError('接続エラーが発生しました');
      }
    );
  }, []);

  // Create new game
  const createNewGame = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await graphqlRequest<{ createGame: GameSession }>(
        operations.createGame,
        { hostPlayerId: playerId }
      );
      setGame(result.createGame);
      subscribeToGame(result.createGame.gameId);
      return result.createGame.gameId;
    } catch (err) {
      console.error('Failed to create game:', err);
      setError('ゲームの作成に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, [playerId, subscribeToGame]);

  // Join existing game
  const joinExistingGame = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const existingGame = await fetchGame(id);
        if (!existingGame) {
          setError('ゲームが見つかりません');
          return false;
        }

        if (
          existingGame.hostPlayerId === playerId ||
          existingGame.guestPlayerId === playerId
        ) {
          subscribeToGame(id);
          return true;
        }

        if (existingGame.status !== 'WAITING') {
          setError('このゲームは既に開始されています');
          return false;
        }

        const result = await graphqlRequest<{ joinGame: GameSession }>(
          operations.joinGame,
          { gameId: id, guestPlayerId: playerId }
        );
        setGame(result.joinGame);
        subscribeToGame(id);
        return true;
      } catch (err) {
        console.error('Failed to join game:', err);
        setError('ゲームへの参加に失敗しました');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [playerId, fetchGame, subscribeToGame]
  );

  // Move piece
  const sendMovePiece = useCallback(
    async (pieceId: string, toQ: number, toR: number) => {
      if (!game) return;
      try {
        await graphqlRequest(operations.movePiece, {
          input: {
            gameId: game.gameId,
            playerId,
            pieceId,
            toQ,
            toR,
          },
        });
      } catch (err) {
        console.error('Failed to move piece:', err);
        setError('コマの移動に失敗しました');
      }
    },
    [game, playerId]
  );

  // Move tile
  const sendMoveTile = useCallback(
    async (fromIndex: number, toQ: number, toR: number) => {
      if (!game) return;
      try {
        await graphqlRequest(operations.moveTile, {
          input: {
            gameId: game.gameId,
            playerId,
            fromIndex,
            toQ,
            toR,
          },
        });
      } catch (err) {
        console.error('Failed to move tile:', err);
        setError('タイルの移動に失敗しました');
      }
    },
    [game, playerId]
  );

  // Abandon game
  const abandonCurrentGame = useCallback(async () => {
    if (!game) return;
    try {
      await graphqlRequest(operations.abandonGame, {
        gameId: game.gameId,
        playerId,
      });
    } catch (err) {
      console.error('Failed to abandon game:', err);
    }
  }, [game, playerId]);

  // Load and auto-join game on mount or when gameId changes
  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    const initGame = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await graphqlRequest<{ getGame: GameSession | null }>(
          operations.getGame,
          { gameId }
        );
        const existingGame = result.getGame;

        if (cancelled) return;

        if (!existingGame) {
          setError('ゲームが見つかりません');
          setLoading(false);
          return;
        }

        const isHost = existingGame.hostPlayerId === playerId;
        const isGuest = existingGame.guestPlayerId === playerId;

        if (isHost || isGuest) {
          setGame(existingGame);
          subscribeToGame(gameId);
          setLoading(false);
          return;
        }

        if (existingGame.status === 'WAITING') {
          const joinResult = await graphqlRequest<{ joinGame: GameSession }>(
            operations.joinGame,
            { gameId, guestPlayerId: playerId }
          );

          if (cancelled) return;

          setGame(joinResult.joinGame);
          subscribeToGame(gameId);
        } else {
          setGame(existingGame);
          setError('このゲームは既に開始されています');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to join game:', err);
        setError('ゲームへの参加に失敗しました');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initGame();

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [gameId, playerId, subscribeToGame]);

  return {
    game,
    playerId,
    myColor,
    isMyTurn,
    loading,
    error,
    createNewGame,
    joinExistingGame,
    sendMovePiece,
    sendMoveTile,
    abandonCurrentGame,
  };
}
