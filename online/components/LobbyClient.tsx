'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { I18N, type I18NStrings } from '@/lib/gameLogic';

function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('nonaga_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('nonaga_player_id', id);
  }
  return id;
}

function getStrings(): I18NStrings {
  if (typeof window === 'undefined') return I18N.ja;
  const lang = (document.documentElement.lang || 'ja').toLowerCase();
  return lang.startsWith('en') ? I18N.en : I18N.ja;
}

export default function LobbyClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strings, setStrings] = useState<I18NStrings>(I18N.ja);

  useEffect(() => {
    setStrings(getStrings());
  }, []);

  const handleCreateGame = async () => {
    setLoading(true);
    setError(null);

    try {
      const playerId = getPlayerId();
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        throw new Error('Failed to create game');
      }

      const game = await res.json();
      router.push(`/game/${game.gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <div className="game-container bg-slate">
      <header className="header">
        <h1 className="game-title">Nonaga</h1>
        <p style={{ color: '#94a3b8', marginTop: 4 }}>{strings.onlineTitle}</p>
      </header>

      <div className="lobby-container">
        <div className="lobby-card">
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="create-game-button"
          >
            {loading ? strings.creating : strings.createGame}
          </button>

          {error && <p className="error-message">{error}</p>}

          <div className="divider">
            <span>or</span>
          </div>

          <a href="/" className="local-game-link">
            ← {strings.localGame}
          </a>
        </div>
      </div>
    </div>
  );
}
