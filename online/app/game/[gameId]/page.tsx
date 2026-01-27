import { getGame } from '@/lib/graphql';
import GameClient from '@/components/GameClient';

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;

  // Fetch initial game state on server
  const initialGame = await getGame(gameId);

  return <GameClient gameId={gameId} initialGame={initialGame} />;
}
