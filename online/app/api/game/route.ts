import { NextResponse } from 'next/server';
import { createGame } from '@/lib/graphql';

// POST /api/game - Create a new game
export async function POST(request: Request) {
  try {
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    const game = await createGame(playerId);
    return NextResponse.json(game);
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
