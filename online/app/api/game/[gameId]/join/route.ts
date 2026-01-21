import { NextResponse } from 'next/server';
import { joinGame } from '@/lib/graphql';

// POST /api/game/[gameId]/join - Join a game
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

    const game = await joinGame(gameId, playerId);
    return NextResponse.json(game);
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}
