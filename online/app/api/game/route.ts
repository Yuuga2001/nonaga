import { NextResponse } from 'next/server';
import { createGame } from '@/lib/graphql';

// POST /api/game - Create a new game
export async function POST(request: Request) {
  try {
    // Check environment variables
    if (!process.env.APPSYNC_ENDPOINT || !process.env.APPSYNC_API_KEY) {
      console.error('Missing environment variables:', {
        hasEndpoint: !!process.env.APPSYNC_ENDPOINT,
        hasApiKey: !!process.env.APPSYNC_API_KEY,
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

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
      { error: 'Failed to create game', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
