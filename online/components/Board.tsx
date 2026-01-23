'use client';

import {
  hexToPixel,
  coordsKey,
  type Tile,
  type Piece,
  type PlayerColor,
  type GamePhase,
} from '@/lib/gameLogic';

interface BoardProps {
  tiles: Tile[];
  pieces: Piece[];
  selectedId: string | number | null;
  phase: GamePhase;
  winner?: PlayerColor;
  victoryLine: string[];
  validDests: Tile[];
  viewBounds: { x: number; y: number; w: number; h: number };
  animatingPiece: { id: string; x: number; y: number } | null;
  animatingTile: { index: number; x: number; y: number } | null;
  pieceMap: Map<string, Piece>;
  isMyTurn: boolean;
  myColor: PlayerColor | null;
  onPieceClick: (piece: Piece) => void;
  onTileClick: (tile: Tile, index: number) => void;
  onDestinationClick: (dest: Tile) => void;
}

export default function Board({
  tiles,
  pieces,
  selectedId,
  phase,
  winner,
  victoryLine,
  validDests,
  viewBounds,
  animatingPiece,
  animatingTile,
  pieceMap,
  isMyTurn,
  myColor,
  onPieceClick,
  onTileClick,
  onDestinationClick,
}: BoardProps) {
  return (
    <div className="board-container">
      <svg
        viewBox={`${viewBounds.x} ${viewBounds.y} ${viewBounds.w} ${viewBounds.h}`}
        className="board-svg"
      >
        <defs>
          <filter id="selected-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur1" />
            <feOffset in="blur1" dx="0" dy="0" result="offsetBlur1" />
            <feFlood floodColor="#fbbf24" floodOpacity="1" result="color1" />
            <feComposite in="color1" in2="offsetBlur1" operator="in" result="glow1" />

            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur2" />
            <feOffset in="blur2" dx="0" dy="0" result="offsetBlur2" />
            <feFlood floodColor="#fbbf24" floodOpacity="0.8" result="color2" />
            <feComposite in="color2" in2="offsetBlur2" operator="in" result="glow2" />

            <feGaussianBlur in="SourceAlpha" stdDeviation="18" result="blur3" />
            <feOffset in="blur3" dx="0" dy="0" result="offsetBlur3" />
            <feFlood floodColor="#fbbf24" floodOpacity="0.5" result="color3" />
            <feComposite in="color3" in2="offsetBlur3" operator="in" result="glow3" />

            <feMerge>
              <feMergeNode in="glow3" />
              <feMergeNode in="glow2" />
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
          {/* Tiles */}
          {tiles.map((tile, i) => {
            const pos =
              animatingTile && animatingTile.index === i
                ? { x: animatingTile.x, y: animatingTile.y }
                : hexToPixel(tile.q, tile.r);
            const key = coordsKey(tile.q, tile.r);
            const isV = victoryLine.includes(key);
            const isSelected = phase === 'move_tile' && selectedId === i;
            const isDestHint =
              phase === 'move_token' &&
              validDests.some((d) => d.q === tile.q && d.r === tile.r);
            const isSelectableEmpty =
              !winner &&
              phase === 'move_tile' &&
              !pieceMap.has(key) &&
              isMyTurn;

            let className = 'tile';
            if (isV) className += ` victory-tile ${winner}`;
            else if (isSelected) className += ' selected-origin';
            else if (isDestHint) className += ' destination-hint';
            else if (isSelectableEmpty) className += ' selectable-empty';
            if (winner && !isV) className += ' faded';

            return (
              <polygon
                key={`tile-${i}`}
                points="-34,-19 0,-38 34,-19 34,19 0,38 -34,19"
                transform={`translate(${pos.x}, ${pos.y})`}
                className={className}
                onClick={() => onTileClick(tile, i)}
              />
            );
          })}

          {/* Tile destination guides */}
          {phase === 'move_tile' &&
            typeof selectedId === 'number' &&
            validDests.map((dest, i) => {
              const { x, y } = hexToPixel(dest.q, dest.r);
              return (
                <polygon
                  key={`guide-${i}`}
                  points="-30,-16 0,-34 30,-16 30,16 0,34 -30,16"
                  transform={`translate(${x}, ${y})`}
                  style={{
                    fill: '#f0fdf4',
                    stroke: '#34d399',
                    strokeWidth: 2,
                    strokeDasharray: 4,
                    opacity: 0.8,
                    cursor: 'pointer',
                  }}
                  onClick={() => onDestinationClick(dest)}
                />
              );
            })}

          {/* Pieces */}
          {pieces.map((p) => {
            const isV = victoryLine.includes(coordsKey(p.q, p.r));
            const isBeingAnimated = animatingPiece && animatingPiece.id === p.id;
            const pos = isBeingAnimated
                ? { x: animatingPiece.x, y: animatingPiece.y }
                : hexToPixel(p.q, p.r);
            const isMyPiece = p.player === myColor;
            const canSelect =
              !winner && isMyPiece && phase === 'move_token' && isMyTurn;
            const isSelected = selectedId === p.id;

            let className = `piece-main ${p.player}`;
            if (isSelected) className += ' selected';
            if (isV) className += ' victory-piece';
            if (canSelect) className += ' my-turn';

            return (
              <g
                key={p.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{
                  cursor: canSelect ? 'pointer' : 'default',
                  transition: isBeingAnimated ? 'none' : 'transform 0.8s cubic-bezier(0.33, 1, 0.68, 1)',
                }}
                onClick={() => onPieceClick(p)}
              >
                <circle r="30" fill="transparent" />
                <circle
                  r="20"
                  className={className}
                  style={{
                    opacity: winner && !isV ? 0.2 : 1,
                    filter: isSelected ? 'url(#selected-glow)' : 'none',
                  }}
                />
                <circle
                  r="14"
                  fill="rgba(0,0,0,0.05)"
                  style={{
                    pointerEvents: 'none',
                    opacity: winner && !isV ? 0 : 1,
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
