import { NextResponse } from 'next/server';
import { movePiece, moveTile } from '@/lib/graphql';

// POST /api/game/[gameId]/move - Make a move (piece or tile)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { playerId, type, pieceId, tileIndex, toQ, toR } = body;

    if (!playerId || !type || toQ === undefined || toR === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let game;

    if (type === 'piece') {
      if (!pieceId) {
        return NextResponse.json(
          { error: 'pieceId is required for piece move' },
          { status: 400 }
        );
      }
      game = await movePiece(gameId, playerId, pieceId, toQ, toR);
    } else if (type === 'tile') {
      if (tileIndex === undefined) {
        return NextResponse.json(
          { error: 'tileIndex is required for tile move' },
          { status: 400 }
        );
      }
      game = await moveTile(gameId, playerId, tileIndex, toQ, toR);
    } else {
      return NextResponse.json(
        { error: 'Invalid move type' },
        { status: 400 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Move error:', error);
    return NextResponse.json(
      {
        error: 'Failed to make move',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
