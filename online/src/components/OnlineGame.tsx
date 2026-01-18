import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOnlineGame } from '../hooks/useOnlineGame';
import {
  getStrings,
  coordsKey,
  hexToPixel,
  calculateViewBounds,
  getSlideDestinations,
  isBoardConnected,
  getValidTileDestinations,
  type Tile,
  type Piece,
} from '../lib/gameLogic';
import Board from './Board/Board';

function OnlineGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const strings = getStrings();

  const {
    game,
    myColor,
    isMyTurn,
    loading,
    error,
    sendMovePiece,
    sendMoveTile,
    abandonCurrentGame,
  } = useOnlineGame(gameId);

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

  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<string | null>(null);

  // Reset selection when game state changes from server
  useEffect(() => {
    if (game && game.updatedAt !== lastUpdateRef.current) {
      lastUpdateRef.current = game.updatedAt;
      setSelectedId(null);
      setIsAnimating(false);
      setAnimatingPiece(null);
      setAnimatingTile(null);
    }
  }, [game]);

  // Computed values
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

  // Valid destinations for current selection
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
          // Send move to server
          sendMovePiece(pieceId, toQ, toR);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [sendMovePiece]
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
          setIsAnimating(false);
          // Send move to server
          sendMoveTile(tileIndex, toQ, toR);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [sendMoveTile]
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
        animatePieceMove(selectedId, piece.q, piece.r, tile.q, tile.r);
      }
    } else if (
      phase === 'move_tile' &&
      !pieceMap.has(coordsKey(tile.q, tile.r))
    ) {
      // Check if removing this tile keeps the board connected
      if (isBoardConnected(tiles, index)) {
        setSelectedId(index);
      } else {
        alert(strings.alertBoardSplit);
      }
    }
  };

  const handleDestinationClick = (dest: Tile) => {
    if (phase === 'move_tile' && typeof selectedId === 'number') {
      const tile = tiles[selectedId];
      setIsAnimating(true);
      animateTileMove(selectedId, tile.q, tile.r, dest.q, dest.r);
    }
  };

  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayAgain = () => {
    navigate('/');
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
          <button onClick={() => navigate('/')} className="back-button">
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
                value={window.location.href}
                readOnly
                className="url-input"
              />
              <button onClick={copyUrl} className="copy-button">
                {copied ? strings.copied : strings.copyUrl}
              </button>
            </div>
            <button
              onClick={() => {
                abandonCurrentGame();
                navigate('/');
              }}
              className="cancel-button"
            >
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
            <button onClick={handlePlayAgain} className="play-again-button">
              {strings.backToLobby}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main game view
  const bgClass = winner === 'red' ? 'bg-rose' : winner === 'blue' ? 'bg-indigo' : 'bg-slate';

  return (
    <div className={`game-container ${bgClass}`}>
      <header className="header">
        <h1 className="game-title">Nonaga</h1>
      </header>

      <div className="status-container">
        {winner ? (
          <div className="victory-container">
            <div className={`victory-badge ${winner}`}>
              <span style={{ fontSize: 20, fontWeight: 900 }}>
                {winner === myColor ? strings.youWin : strings.opponentWin}
              </span>
            </div>
            <button onClick={handlePlayAgain} className="reset-button">
              {strings.playAgain}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className={`turn-indicator ${isAnimating ? 'disabled' : ''}`}>
                <div className={`player-indicator ${game?.turn === 'red' ? 'active' : ''}`}>
                  <div className="player-dot red" />
                  {myColor === 'red' ? strings.you : strings.opponent}
                </div>
                <div style={{ width: 1, height: 12, background: '#e2e8f0' }} />
                <div className={`player-indicator ${game?.turn === 'blue' ? 'active' : ''}`}>
                  <div className="player-dot blue" />
                  {myColor === 'blue' ? strings.you : strings.opponent}
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
            <span style={{ fontSize: 16 }}>🏆</span>
            <div>
              <p>{strings.goal}</p>
              <p className="goal-hint">{strings.goalHint}</p>
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

export default OnlineGame;
