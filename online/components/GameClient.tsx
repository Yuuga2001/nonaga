'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Board from './Board';
import {
  I18N,
  type I18NStrings,
  type GameSession,
  type Tile,
  type Piece,
  type PlayerColor,
  coordsKey,
  hexToPixel,
  calculateViewBounds,
  getSlideDestinations,
  isBoardConnected,
  getValidTileDestinations,
  getPlayerColor,
} from '@/lib/gameLogic';

function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('nonaga_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('nonaga_player_id', id);
  }
  return id;
}

function getStrings(): I18NStrings {
  if (typeof window === 'undefined') return I18N.ja;
  const lang = (document.documentElement.lang || 'ja').toLowerCase();
  return lang.startsWith('en') ? I18N.en : I18N.ja;
}

interface GameClientProps {
  gameId: string;
  initialGame: GameSession | null;
}

export default function GameClient({ gameId, initialGame }: GameClientProps) {
  const router = useRouter();
  const [strings, setStrings] = useState<I18NStrings>(I18N.ja);
  const [playerId, setPlayerId] = useState<string>('');
  const [game, setGame] = useState<GameSession | null>(initialGame);
  const [loading, setLoading] = useState(!initialGame);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingPiece, setAnimatingPiece] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [animatingTile, setAnimatingTile] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);

  // Initialize client-side state
  useEffect(() => {
    setStrings(getStrings());
    setPlayerId(getPlayerId());
  }, []);

  // Fetch game and join if needed
  useEffect(() => {
    if (!playerId) return;

    const fetchAndJoin = async () => {
      try {
        // First fetch current state
        const res = await fetch(`/api/game/${gameId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError(strings.gameNotFound);
          } else {
            setError('Failed to load game');
          }
          setLoading(false);
          return;
        }

        let gameData: GameSession = await res.json();

        // Join if waiting and not already a player
        if (
          gameData.status === 'WAITING' &&
          gameData.hostPlayerId !== playerId &&
          !gameData.guestPlayerId
        ) {
          const joinRes = await fetch(`/api/game/${gameId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
          });

          if (joinRes.ok) {
            gameData = await joinRes.json();
          }
        }

        setGame(gameData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchAndJoin();
  }, [gameId, playerId, strings.gameNotFound]);

  // Polling for game updates (1 second interval)
  // Continue polling during FINISHED to detect rematch/end from opponent
  useEffect(() => {
    if (!game || game.status === 'ABANDONED') {
      return;
    }

    const poll = async () => {
      // Skip polling during animation to prevent state conflicts
      if (isAnimatingRef.current) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`/api/game/${gameId}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: GameSession = await res.json();
          if (data.updatedAt !== lastUpdateRef.current) {
            lastUpdateRef.current = data.updatedAt;
            // Opponent ended the game - redirect to lobby
            if (data.status === 'ABANDONED') {
              router.push('/');
              return;
            }
            // Only reset selection when turn changes (opponent made a move)
            const turnChanged = game?.turn !== data.turn;
            if (turnChanged) {
              setSelectedId(null);
            }
            setGame(data);
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Polling error:', err);
        }
      }
    };

    pollingRef.current = setInterval(poll, 1000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [game, gameId, router]);

  // Computed values
  const myColor = useMemo(() => {
    if (!game || !playerId) return null;
    return getPlayerColor(game, playerId);
  }, [game, playerId]);

  const isMyTurn = useMemo(() => {
    if (!game || !myColor) return false;
    return game.status === 'PLAYING' && game.turn === myColor;
  }, [game, myColor]);

  const tiles = game?.tiles || [];
  const pieces = game?.pieces || [];
  const phase = game?.phase || 'waiting';
  const winner = game?.winner;
  const victoryLine = game?.victoryLine || [];
  const status = game?.status;

  const pieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    pieces.forEach((p) => map.set(coordsKey(p.q, p.r), p));
    return map;
  }, [pieces]);

  const viewBounds = useMemo(() => calculateViewBounds(tiles), [tiles]);

  const validDests = useMemo(() => {
    if (winner || isAnimating || !isMyTurn) return [];

    if (phase === 'move_token' && typeof selectedId === 'string') {
      const piece = pieces.find((p) => p.id === selectedId);
      if (!piece) return [];
      return getSlideDestinations(piece, tiles, pieces);
    }

    if (phase === 'move_tile' && typeof selectedId === 'number') {
      return getValidTileDestinations(selectedId, tiles);
    }

    return [];
  }, [selectedId, phase, tiles, pieces, winner, isAnimating, isMyTurn]);

  // Send move to server with retry
  const sendMove = useCallback(
    async (
      type: 'piece' | 'tile',
      pieceId: string | null,
      tileIndex: number | null,
      toQ: number,
      toR: number
    ) => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await fetch(`/api/game/${gameId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              type,
              pieceId,
              tileIndex,
              toQ,
              toR,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setGame(data);
            lastUpdateRef.current = data.updatedAt;
            setSelectedId(null);
            return; // Success
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error('Move failed:', res.status, errorData);
            return; // Server error, don't retry
          }
        } catch (err) {
          lastError = err as Error;
          console.error(`Move error (attempt ${attempt + 1}/${maxRetries}):`, err);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      }

      // All retries failed - refresh game state
      if (lastError) {
        console.error('All move retries failed, refreshing game state');
        try {
          const res = await fetch(`/api/game/${gameId}`);
          if (res.ok) {
            const data = await res.json();
            setGame(data);
            lastUpdateRef.current = data.updatedAt;
          }
        } catch (e) {
          console.error('Failed to refresh game state:', e);
        }
      }
    },
    [gameId, playerId]
  );

  // Animation functions
  const animatePieceMove = useCallback(
    (pieceId: string, fromQ: number, fromR: number, toQ: number, toR: number) => {
      const startTime = performance.now();
      const fromPos = hexToPixel(fromQ, fromR);
      const toPos = hexToPixel(toQ, toR);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / 800, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatingPiece({
          id: pieceId,
          x: fromPos.x + (toPos.x - fromPos.x) * eased,
          y: fromPos.y + (toPos.y - fromPos.y) * eased,
        });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Keep animatingPiece at destination until server confirms the move
          setAnimatingPiece({ id: pieceId, x: toPos.x, y: toPos.y });
          setIsAnimating(false);
          // Keep isAnimatingRef.current = true until sendMove completes
          sendMove('piece', pieceId, null, toQ, toR).finally(() => {
            setAnimatingPiece(null);
            isAnimatingRef.current = false;
          });
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [sendMove]
  );

  const animateTileMove = useCallback(
    (
      tileIndex: number,
      fromQ: number,
      fromR: number,
      toQ: number,
      toR: number
    ) => {
      const startTime = performance.now();
      const fromPos = hexToPixel(fromQ, fromR);
      const toPos = hexToPixel(toQ, toR);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / 800, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatingTile({
          index: tileIndex,
          x: fromPos.x + (toPos.x - fromPos.x) * eased,
          y: fromPos.y + (toPos.y - fromPos.y) * eased,
        });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setAnimatingTile(null);
          setIsAnimating(false);
          // Keep isAnimatingRef.current = true until sendMove completes
          sendMove('tile', null, tileIndex, toQ, toR).finally(() => {
            isAnimatingRef.current = false;
          });
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [sendMove]
  );

  // Event handlers
  const handlePieceClick = (piece: Piece) => {
    if (
      winner ||
      phase !== 'move_token' ||
      piece.player !== myColor ||
      isAnimating ||
      !isMyTurn
    ) {
      return;
    }
    setSelectedId(selectedId === piece.id ? null : piece.id);
  };

  const handleTileClick = (tile: Tile, index: number) => {
    if (winner || isAnimating || !isMyTurn) return;

    if (phase === 'move_token' && typeof selectedId === 'string') {
      const piece = pieces.find((p) => p.id === selectedId);
      if (!piece) return;

      const isValidDest = validDests.some(
        (d) => d.q === tile.q && d.r === tile.r
      );
      if (isValidDest) {
        setIsAnimating(true);
        isAnimatingRef.current = true;
        animatePieceMove(selectedId, piece.q, piece.r, tile.q, tile.r);
      }
    } else if (
      phase === 'move_tile' &&
      !pieceMap.has(coordsKey(tile.q, tile.r))
    ) {
      if (isBoardConnected(tiles, index)) {
        setSelectedId(index);
      } else {
        alert(strings.alertBoardSplit);
      }
    }
  };

  const handleDestinationClick = (dest: Tile) => {
    if (winner || isAnimating || !isMyTurn) return;

    if (phase === 'move_tile' && typeof selectedId === 'number') {
      const tile = tiles[selectedId];
      setIsAnimating(true);
      isAnimatingRef.current = true;
      animateTileMove(selectedId, tile.q, tile.r, dest.q, dest.r);
    }
  };

  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAbandon = async () => {
    try {
      await fetch(`/api/game/${gameId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch (err) {
      console.error('Abandon error:', err);
    }
    router.push('/');
  };

  const handlePlayAgain = async () => {
    try {
      const res = await fetch(`/api/game/${gameId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      if (res.ok) {
        const data = await res.json();
        lastUpdateRef.current = data.updatedAt;
        setGame(data);
      }
    } catch (err) {
      console.error('Rematch error:', err);
    }
  };

  const handleEndGame = () => {
    setShowEndConfirm(true);
  };

  const confirmEndGame = async () => {
    setShowEndConfirm(false);
    try {
      await fetch(`/api/game/${gameId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch (err) {
      console.error('End game error:', err);
    }
    router.push('/');
  };

  // Loading state
  if (loading) {
    return (
      <div className="game-container bg-slate">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="game-container bg-slate">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => router.push('/')} className="back-button">
            {strings.backToLobby}
          </button>
        </div>
      </div>
    );
  }

  // Waiting for opponent
  if (status === 'WAITING') {
    return (
      <div className="game-container bg-slate">
        <header className="header">
          <h1 className="game-title">Nonaga</h1>
        </header>

        <div className="waiting-container">
          <div className="waiting-card">
            <div className="waiting-spinner" />
            <h2>{strings.waitingForOpponent}</h2>
            <p style={{ marginTop: 16, color: '#64748b' }}>{strings.shareUrl}</p>
            <div className="url-box">
              <input
                type="text"
                value={typeof window !== 'undefined' ? window.location.href : ''}
                readOnly
                className="url-input"
              />
              <button onClick={copyUrl} className="copy-button">
                {copied ? strings.copied : strings.copyUrl}
              </button>
            </div>
            <button onClick={handleAbandon} className="cancel-button">
              {strings.backToLobby}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game abandoned
  if (status === 'ABANDONED') {
    return (
      <div className="game-container bg-slate">
        <div className="result-container">
          <div className="result-card">
            <h2>{strings.abandoned}</h2>
            <button onClick={() => router.push('/')} className="play-again-button">
              {strings.backToLobby}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main game view
  const bgClass =
    winner === 'red' ? 'bg-rose' : winner === 'blue' ? 'bg-indigo' : 'bg-slate';

  return (
    <div className={`game-container ${bgClass}`}>
      {showEndConfirm && (
        <div className="mode-selector-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="mode-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mode-selector-title" style={{marginBottom: '1rem', whiteSpace: 'pre-line', lineHeight: '1.6'}}>
              {strings.confirmEndGame}
            </div>
            <div style={{display: 'flex', gap: '0.75rem', marginTop: '1.5rem'}}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#cbd5e1'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
              >
                {strings.cancel}
              </button>
              <button
                onClick={confirmEndGame}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                {strings.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="header">
        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <h1 className="game-title">Nonaga</h1>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'white',
            background: '#10b981',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            {strings.onlineTitle}
          </div>
        </div>
      </header>

      <div className="status-container">
        {winner ? (
          <div className="victory-container">
            <div className={`victory-badge ${winner}`}>
              <span style={{ fontSize: 20, fontWeight: 900 }}>
                {winner === myColor ? strings.youWin : strings.opponentWin}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={handlePlayAgain} className="reset-button" style={{ marginTop: 0 }}>
                {strings.playAgain}
              </button>
              <button onClick={handleEndGame} className="reset-button" style={{ marginTop: 0, background: '#64748b' }}>
                {strings.endGame}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className={`turn-indicator ${isAnimating ? 'disabled' : ''}`}>
                <div
                  className={`player-indicator ${game?.turn === 'red' ? 'active' : ''}`}
                >
                  <div className="player-dot red" />
                  {myColor === 'red' ? strings.you : strings.opponent}
                </div>
                <div
                  style={{ width: 1, height: 12, background: '#e2e8f0' }}
                />
                <div
                  className={`player-indicator ${game?.turn === 'blue' ? 'active' : ''}`}
                >
                  <div className="player-dot blue" />
                  {myColor === 'blue' ? strings.you : strings.opponent}
                </div>
              </div>
              <button onClick={handleEndGame} className="mode-button" disabled={isAnimating}>
                {strings.endGame}
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#94a3b8',
                marginTop: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {isMyTurn
                ? phase === 'move_token'
                  ? strings.phaseMoveToken
                  : strings.phaseMoveTile
                : strings.opponentTurn}
            </div>
          </div>
        )}
      </div>

      <Board
        tiles={tiles}
        pieces={pieces}
        selectedId={selectedId}
        phase={phase}
        winner={winner}
        victoryLine={victoryLine}
        validDests={validDests}
        viewBounds={viewBounds}
        animatingPiece={animatingPiece}
        animatingTile={animatingTile}
        pieceMap={pieceMap}
        isMyTurn={isMyTurn}
        myColor={myColor}
        onPieceClick={handlePieceClick}
        onTileClick={handleTileClick}
        onDestinationClick={handleDestinationClick}
      />

      <aside className="rules-container">
        <div className="rules-card">
          <div className="goal-box">
            <span style={{ fontSize: 16 }}>&#127942;</span>
            <div>
              <p>{strings.goal}</p>
            </div>
          </div>
          <div className="steps-grid">
            <div className="step-item">
              <span className="step-number">1</span>
              <p>{strings.slideToEdge}</p>
            </div>
            <div className="step-item">
              <span className="step-number">2</span>
              <p>{strings.moveEmptyTile}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
