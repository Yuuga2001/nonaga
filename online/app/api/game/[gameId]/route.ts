import { NextResponse } from 'next/server';
import { getGame, abandonGame } from '@/lib/graphql';

// GET /api/game/[gameId] - Get game state
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const game = await getGame(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json(
      { error: 'Failed to get game' },
      { status: 500 }
    );
  }
}

// DELETE /api/game/[gameId] - Abandon game
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    const game = await abandonGame(gameId, playerId);
    return NextResponse.json(game);
  } catch (error) {
    console.error('Abandon game error:', error);
    return NextResponse.json(
      { error: 'Failed to abandon game' },
      { status: 500 }
    );
  }
}
