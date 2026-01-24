import {
  type Tile,
  type Piece,
  type PlayerColor,
  DIRECTIONS,
  coordsKey,
} from './gameLogic';

export interface AIPieceMove {
  pieceId: string;
  fromQ: number;
  fromR: number;
  toQ: number;
  toR: number;
}

export interface AITileMove {
  fromIndex: number;
  toQ: number;
  toR: number;
}

function countAdjacentPairs(pieces: Piece[]): number {
  let count = 0;
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const p1 = pieces[i], p2 = pieces[j];
      if (DIRECTIONS.some(d => p1.q + d.q === p2.q && p1.r + d.r === p2.r)) {
        count++;
      }
    }
  }
  return count;
}

export function computeAIPieceMove(
  pieces: Piece[],
  tiles: Tile[],
  turn: PlayerColor
): AIPieceMove | null {
  const myPieces = pieces.filter(p => p.player === turn);
  if (myPieces.length === 0) return null;

  const tileSet = new Set(tiles.map(t => coordsKey(t.q, t.r)));
  const pieceMap = new Map(pieces.map(p => [coordsKey(p.q, p.r), p]));

  let bestMove: AIPieceMove | null = null;
  let bestScore = -Infinity;

  myPieces.forEach(piece => {
    DIRECTIONS.forEach(dir => {
      let cq = piece.q, cr = piece.r;
      while (true) {
        const nq = cq + dir.q, nr = cr + dir.r;
        if (!tileSet.has(coordsKey(nq, nr))) break;
        if (pieceMap.has(coordsKey(nq, nr))) break;
        cq = nq;
        cr = nr;
      }
      if (cq === piece.q && cr === piece.r) return;

      const testPieces = pieces.map(p =>
        p.id === piece.id ? { ...p, q: cq, r: cr } : p
      );
      const myTestPieces = testPieces.filter(p => p.player === turn);
      const enemyPieces = testPieces.filter(p => p.player !== turn);

      let score = 0;

      const adjacentPairs = countAdjacentPairs(myTestPieces);
      if (adjacentPairs >= 2) {
        score = 10000;
      } else {
        score += adjacentPairs * 500;

        let minDist = Infinity;
        for (let i = 0; i < myTestPieces.length; i++) {
          for (let j = i + 1; j < myTestPieces.length; j++) {
            const p1 = myTestPieces[i], p2 = myTestPieces[j];
            const dist = Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r);
            minDist = Math.min(minDist, dist);
          }
        }
        score -= minDist * 30;

        const centerQ = myTestPieces.reduce((sum, p) => sum + p.q, 0) / 3;
        const centerR = myTestPieces.reduce((sum, p) => sum + p.r, 0) / 3;
        const compactness = myTestPieces.reduce((sum, p) => {
          return sum + Math.abs(p.q - centerQ) + Math.abs(p.r - centerR);
        }, 0);
        score -= compactness * 20;

        const enemyAdjacentPairs = countAdjacentPairs(enemyPieces);
        score -= enemyAdjacentPairs * 200;

        const distToCenter = Math.abs(cq) + Math.abs(cr);
        score -= distToCenter * 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = { pieceId: piece.id, fromQ: piece.q, fromR: piece.r, toQ: cq, toR: cr };
      }
    });
  });

  return bestMove;
}

export function computeAITileMove(
  pieces: Piece[],
  tiles: Tile[],
  turn: PlayerColor
): AITileMove | null {
  const myPieces = pieces.filter(p => p.player === turn);
  const enemyPieces = pieces.filter(p => p.player !== turn);
  const pieceMap = new Map(pieces.map(p => [coordsKey(p.q, p.r), p]));

  const emptyTiles = tiles
    .map((t, i) => ({ tile: t, index: i }))
    .filter(({ tile }) => !pieceMap.has(coordsKey(tile.q, tile.r)));

  if (emptyTiles.length === 0) return null;

  let bestMove: AITileMove | null = null;
  let bestScore = -Infinity;

  emptyTiles.forEach(({ tile: selectedTile, index: selectedIndex }) => {
    const rem = tiles.filter((_, i) => i !== selectedIndex);
    const candidates = new Map<string, { q: number; r: number; c: number }>();

    rem.forEach(t =>
      DIRECTIONS.forEach(d => {
        const nQ = t.q + d.q, nR = t.r + d.r;
        const k = coordsKey(nQ, nR);
        if (
          rem.some(rt => rt.q === nQ && rt.r === nR) ||
          coordsKey(selectedTile.q, selectedTile.r) === k
        )
          return;
        const data = candidates.get(k) || { q: nQ, r: nR, c: 0 };
        data.c++;
        candidates.set(k, data);
      })
    );

    candidates.forEach(dest => {
      if (dest.c < 2) return;

      // Connectivity check
      const tempTiles = rem.map(t => ({ q: t.q, r: t.r }));
      tempTiles.push({ q: dest.q, r: dest.r });
      const queue = [tempTiles[0]];
      const visited = new Set([coordsKey(tempTiles[0].q, tempTiles[0].r)]);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        DIRECTIONS.forEach(d => {
          const k2 = coordsKey(cur.q + d.q, cur.r + d.r);
          if (
            tempTiles.some(t => coordsKey(t.q, t.r) === k2) &&
            !visited.has(k2)
          ) {
            visited.add(k2);
            queue.push({ q: cur.q + d.q, r: cur.r + d.r });
          }
        });
      }
      if (visited.size !== tempTiles.length) return;

      let score = 0;

      // Check if enemy can win next turn after this tile move
      const newTiles = [...rem, { q: dest.q, r: dest.r }];
      const newTileSet = new Set(newTiles.map(t => coordsKey(t.q, t.r)));

      let enemyCanWinNextTurn = false;
      for (const enemyPiece of enemyPieces) {
        for (const dir of DIRECTIONS) {
          let eq = enemyPiece.q, er = enemyPiece.r;
          while (true) {
            const nQ = eq + dir.q, nR = er + dir.r;
            if (!newTileSet.has(coordsKey(nQ, nR))) break;
            if (pieces.some(p => p.q === nQ && p.r === nR && p.id !== enemyPiece.id)) break;
            eq = nQ;
            er = nR;
          }
          if (eq === enemyPiece.q && er === enemyPiece.r) continue;

          const testEnemyPieces = enemyPieces.map(p =>
            p.id === enemyPiece.id ? { ...p, q: eq, r: er } : p
          );
          if (countAdjacentPairs(testEnemyPieces) >= 2) {
            enemyCanWinNextTurn = true;
            break;
          }
        }
        if (enemyCanWinNextTurn) break;
      }

      const enemyPieceTiles = enemyPieces.map(p => coordsKey(p.q, p.r));
      const isEnemyPieceOnSelectedTile = enemyPieceTiles.includes(
        coordsKey(selectedTile.q, selectedTile.r)
      );

      if (enemyCanWinNextTurn && isEnemyPieceOnSelectedTile) {
        score += 15000;
      } else if (enemyCanWinNextTurn) {
        score -= 5000;
      }

      const enemyAdjacentPairs = countAdjacentPairs(enemyPieces);

      if (isEnemyPieceOnSelectedTile) {
        const selectedEnemyPiece = enemyPieces.find(
          p => p.q === selectedTile.q && p.r === selectedTile.r
        );
        if (selectedEnemyPiece) {
          const otherEnemyPieces = enemyPieces.filter(p => p.id !== selectedEnemyPiece.id);
          const avgDistBefore =
            otherEnemyPieces.reduce((sum, p) => {
              return sum + Math.abs(selectedTile.q - p.q) + Math.abs(selectedTile.r - p.r);
            }, 0) / otherEnemyPieces.length;
          const avgDistAfter =
            otherEnemyPieces.reduce((sum, p) => {
              return sum + Math.abs(dest.q - p.q) + Math.abs(dest.r - p.r);
            }, 0) / otherEnemyPieces.length;

          const distImprovement = avgDistAfter - avgDistBefore;
          score += distImprovement * 100;

          if (enemyAdjacentPairs >= 1) {
            score += distImprovement * 200;
          }
        }
      }

      const myPieceTiles = myPieces.map(p => coordsKey(p.q, p.r));
      const isMyPieceOnSelectedTile = myPieceTiles.includes(
        coordsKey(selectedTile.q, selectedTile.r)
      );

      if (isMyPieceOnSelectedTile) {
        const selectedPiece = myPieces.find(
          p => p.q === selectedTile.q && p.r === selectedTile.r
        );
        if (selectedPiece) {
          const otherPieces = myPieces.filter(p => p.id !== selectedPiece.id);
          const avgDist =
            otherPieces.reduce((sum, p) => {
              return sum + Math.abs(dest.q - p.q) + Math.abs(dest.r - p.r);
            }, 0) / otherPieces.length;
          score -= avgDist * 50;
        }
      } else {
        let totalDist = 0;
        for (let i = 0; i < myPieces.length; i++) {
          for (let j = i + 1; j < myPieces.length; j++) {
            const p1 = myPieces[i], p2 = myPieces[j];
            totalDist += Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r);
          }
        }
        score -= totalDist * 10;
      }

      score += Math.random() * 3;

      if (score > bestScore) {
        bestScore = score;
        bestMove = { fromIndex: selectedIndex, toQ: dest.q, toR: dest.r };
      }
    });
  });

  return bestMove;
}
