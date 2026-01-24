'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Board from './Board';
import {
  I18N,
  type I18NStrings,
  type Tile,
  type Piece,
  type PlayerColor,
  type GamePhase,
  coordsKey,
  hexToPixel,
  calculateViewBounds,
  getSlideDestinations,
  getVictoryCoords,
  isBoardConnected,
  getValidTileDestinations,
  INITIAL_TILES,
  INITIAL_PIECES,
} from '@/lib/gameLogic';
import { computeAIPieceMove, computeAITileMove } from '@/lib/aiLogic';

type LocalMode = 'select' | 'pvp' | 'ai';

function getStrings(): I18NStrings {
  if (typeof window === 'undefined') return I18N.ja;
  const lang = (document.documentElement.lang || 'ja').toLowerCase();
  return lang.startsWith('en') ? I18N.en : I18N.ja;
}

export default function LocalGameClient() {
  const router = useRouter();
  const [strings, setStrings] = useState<I18NStrings>(I18N.ja);

  // Mode
  const [mode, setMode] = useState<LocalMode>('select');
  const [aiPlayer, setAiPlayer] = useState<PlayerColor>('blue');
  const [aiThinking, setAiThinking] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Game state
  const [tiles, setTiles] = useState<Tile[]>([...INITIAL_TILES]);
  const [pieces, setPieces] = useState<Piece[]>([...INITIAL_PIECES]);
  const [turn, setTurn] = useState<PlayerColor>('red');
  const [phase, setPhase] = useState<GamePhase>('move_token');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [winner, setWinner] = useState<PlayerColor | undefined>(undefined);
  const [victoryLine, setVictoryLine] = useState<string[]>([]);

  // Animation
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

  const animationFrameRef = useRef<number | null>(null);
  const tilesRef = useRef(tiles);
  const piecesRef = useRef(pieces);
  const turnRef = useRef(turn);

  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { turnRef.current = turn; }, [turn]);

  useEffect(() => {
    setStrings(getStrings());
  }, []);

  // Shuffle animation for AI mode
  useEffect(() => {
    if (mode === 'ai' && isShuffling) {
      const timer = setTimeout(() => {
        setAiPlayer(Math.random() < 0.5 ? 'red' : 'blue');
        setIsShuffling(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [mode, isShuffling]);

  // AI turn trigger
  useEffect(() => {
    if (
      mode !== 'ai' ||
      turn !== aiPlayer ||
      winner ||
      isAnimating ||
      aiThinking ||
      isShuffling
    )
      return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      if (phase === 'move_token') {
        const move = computeAIPieceMove(piecesRef.current, tilesRef.current, turnRef.current);
        if (move) {
          setIsAnimating(true);
          animatePieceMove(move.pieceId, move.fromQ, move.fromR, move.toQ, move.toR);
        }
      } else if (phase === 'move_tile') {
        const move = computeAITileMove(piecesRef.current, tilesRef.current, turnRef.current);
        if (move) {
          setIsAnimating(true);
          animateTileMove(
            move.fromIndex,
            tilesRef.current[move.fromIndex].q,
            tilesRef.current[move.fromIndex].r,
            move.toQ,
            move.toR
          );
        }
      }
      setAiThinking(false);
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, mode, aiPlayer, winner, isAnimating, aiThinking, isShuffling]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Computed values
  const isMyTurn = useMemo(() => {
    if (winner) return false;
    if (mode === 'pvp') return true;
    return turn !== aiPlayer && !aiThinking;
  }, [mode, turn, aiPlayer, aiThinking, winner]);

  const myColor = useMemo((): PlayerColor | null => {
    if (mode === 'pvp') return turn;
    return aiPlayer === 'red' ? 'blue' : 'red';
  }, [mode, turn, aiPlayer]);

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
          setAnimatingPiece(null);
          setIsAnimating(false);

          const currentPieces = piecesRef.current;
          const nextPieces = currentPieces.map((p) =>
            p.id === pieceId ? { ...p, q: toQ, r: toR } : p
          );
          setPieces(nextPieces);

          const currentTurn = turnRef.current;
          const winCoords = getVictoryCoords(nextPieces, currentTurn);
          if (winCoords) {
            setWinner(currentTurn);
            setVictoryLine(winCoords);
            setPhase('ended');
          } else {
            setPhase('move_tile');
            setSelectedId(null);
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    []
  );

  const animateTileMove = useCallback(
    (tileIndex: number, fromQ: number, fromR: number, toQ: number, toR: number) => {
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

          const currentTiles = tilesRef.current;
          const nextTiles = [...currentTiles];
          nextTiles[tileIndex] = { q: toQ, r: toR };
          setTiles(nextTiles);
          setPhase('move_token');
          setSelectedId(null);
          setIsAnimating(false);
          setTurn((prev) => (prev === 'red' ? 'blue' : 'red'));
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    []
  );

  // Event handlers
  const handlePieceClick = (piece: Piece) => {
    if (winner || phase !== 'move_token' || isAnimating || !isMyTurn) return;
    if (mode === 'pvp') {
      if (piece.player !== turn) return;
    } else {
      if (piece.player === aiPlayer) return;
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
      animateTileMove(selectedId, tile.q, tile.r, dest.q, dest.r);
    }
  };

  // Mode selection handlers
  const handleSelectAI = () => {
    setMode('ai');
    setIsShuffling(true);
  };

  const handleSelectPvP = () => {
    setMode('pvp');
  };

  const resetGame = () => {
    setTiles([...INITIAL_TILES]);
    setPieces([...INITIAL_PIECES]);
    setTurn('red');
    setPhase('move_token');
    setSelectedId(null);
    setWinner(undefined);
    setVictoryLine([]);
    setIsAnimating(false);
    setAnimatingPiece(null);
    setAnimatingTile(null);
    setAiThinking(false);

    if (mode === 'ai') {
      setIsShuffling(true);
    }
  };

  const handleBackToSelect = () => {
    setMode('select');
    resetGame();
    setIsShuffling(false);
  };

  // Confetti component
  const confetti = winner && (
    <div className="confetti-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="confetti-dot"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * -20}%`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            background: winner === 'red'
              ? `hsl(${350 + Math.random() * 20}, 80%, ${50 + Math.random() * 20}%)`
              : `hsl(${220 + Math.random() * 30}, 80%, ${50 + Math.random() * 20}%)`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );

  // Mode selection screen
  if (mode === 'select') {
    return (
      <div className="game-container bg-slate">
        <header className="header">
          <h1 className="game-title">Nonaga</h1>
        </header>

        <div className="mode-selector-container">
          <h2 className="mode-selector-title">{strings.selectMode}</h2>
          <div className="mode-selector-options">
            <button className="mode-option" onClick={handleSelectAI}>
              <span className="mode-icon">🤖</span>
              <span>{strings.aiMode}</span>
            </button>
            <button className="mode-option" onClick={handleSelectPvP}>
              <span className="mode-icon">👥</span>
              <span>{strings.pvpMode}</span>
            </button>
            <button className="mode-option" onClick={() => router.push('/')}>
              <span className="mode-icon">🌐</span>
              <span>{strings.onlineMode}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Shuffle animation (AI mode start)
  if (mode === 'ai' && isShuffling) {
    return (
      <div className="game-container bg-slate">
        <header className="header">
          <h1 className="game-title">Nonaga</h1>
        </header>

        <div className="shuffle-overlay">
          <p className="shuffle-text">{strings.shuffleDeciding}</p>
          <div className="shuffle-players">
            <div className="shuffle-player">
              <div className="shuffle-avatar human">👤</div>
              <span className="shuffle-label">{strings.you}</span>
            </div>
            <span style={{ fontSize: '1.25rem', color: '#94a3b8' }}>vs</span>
            <div className="shuffle-player">
              <div className="shuffle-avatar ai">🤖</div>
              <span className="shuffle-label">AI</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main game view
  const bgClass =
    winner === 'red' ? 'bg-rose' : winner === 'blue' ? 'bg-indigo' : 'bg-slate';

  const getWinnerText = () => {
    if (!winner) return '';
    if (mode === 'ai') {
      return winner === aiPlayer ? strings.aiWin : strings.youWin;
    }
    return winner === 'red' ? strings.redWin : strings.blueWin;
  };

  const getTurnText = () => {
    if (aiThinking) return strings.aiThinking;
    if (mode === 'pvp') {
      return turn === 'red' ? strings.redTurn : strings.blueTurn;
    }
    return turn === aiPlayer ? strings.aiThinking : (
      phase === 'move_token' ? strings.phaseMoveToken : strings.phaseMoveTile
    );
  };

  return (
    <div className={`game-container ${bgClass}`}>
      {confetti}

      <header className="header">
        <h1 className="game-title">Nonaga</h1>
        <button className="mode-switch-button" onClick={handleBackToSelect}>
          ← {strings.selectMode}
        </button>
      </header>

      <div className="status-container">
        {winner ? (
          <div className="victory-container">
            <div className={`victory-badge ${winner}`}>
              <span style={{ fontSize: 20, fontWeight: 900 }}>
                {getWinnerText()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={resetGame} className="reset-button" style={{ marginTop: 0 }}>
                {strings.playAgain}
              </button>
              <button
                onClick={handleBackToSelect}
                className="reset-button"
                style={{ marginTop: 0, background: '#64748b' }}
              >
                {strings.selectMode}
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
              <div className={`turn-indicator ${isAnimating || aiThinking ? 'disabled' : ''}`}>
                <div className={`player-indicator ${turn === 'red' ? 'active' : ''}`}>
                  <div className="player-dot red" />
                  {mode === 'ai'
                    ? (aiPlayer === 'red' ? 'AI' : strings.you)
                    : strings.playerRed}
                </div>
                <div style={{ width: 1, height: 12, background: '#e2e8f0' }} />
                <div className={`player-indicator ${turn === 'blue' ? 'active' : ''}`}>
                  <div className="player-dot blue" />
                  {mode === 'ai'
                    ? (aiPlayer === 'blue' ? 'AI' : strings.you)
                    : strings.playerBlue}
                </div>
              </div>
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
              {getTurnText()}
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
