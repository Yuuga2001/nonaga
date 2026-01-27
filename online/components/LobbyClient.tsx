'use client';

import { useState, useEffect, useMemo } from 'react';
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

type Lang = 'ja' | 'en';

const LANG_KEY = 'nonaga_lang';

function readLang(): Lang {
  if (typeof window === 'undefined') return 'ja';
  const stored = localStorage.getItem(LANG_KEY);
  const lang = (stored || document.documentElement.lang || 'ja').toLowerCase();
  return lang.startsWith('en') ? 'en' : 'ja';
}

function persistLang(next: Lang) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANG_KEY, next);
  document.documentElement.lang = next;
}

export default function LobbyClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('ja');
  const strings = useMemo<I18NStrings>(() => I18N[lang], [lang]);

  useEffect(() => {
    setLang(readLang());
  }, []);

  useEffect(() => {
    persistLang(lang);
  }, [lang]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'ja' : 'en'));
  };

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

          <a href="/local" className="local-game-link">
            ← {strings.localGame}
          </a>
        </div>
      </div>
      <div className="language-footer">
        <button type="button" onClick={toggleLang} className="language-toggle">
          {lang === 'en' ? '日本語に変更' : 'Change to English'}
        </button>
      </div>
    </div>
  );
}
