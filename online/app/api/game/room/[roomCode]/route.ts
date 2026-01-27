import { NextResponse } from 'next/server';
import { getGameByRoomCode } from '@/lib/graphql';

// GET /api/game/room/[roomCode] - Get game by room code
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  if (!roomCode) {
    return NextResponse.json(
      { error: 'roomCode is required' },
      { status: 400 }
    );
  }

  const game = await getGameByRoomCode(roomCode);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(game);
}
