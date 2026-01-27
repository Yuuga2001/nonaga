import { NextResponse } from 'next/server';
import { rematchGame } from '@/lib/graphql';

// POST /api/game/[gameId]/rematch - Rematch in the same room
export async function POST(
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

    const game = await rematchGame(gameId, playerId);
    return NextResponse.json(game);
  } catch (error) {
    console.error('Rematch game error:', error);
    return NextResponse.json(
      { error: 'Failed to rematch game' },
      { status: 500 }
    );
  }
}
