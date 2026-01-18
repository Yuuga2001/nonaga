import { useNavigate } from 'react-router-dom';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { getStrings } from '../lib/gameLogic';

function Lobby() {
  const navigate = useNavigate();
  const { createNewGame, loading, error } = useOnlineGame();
  const strings = getStrings();

  const handleCreateGame = async () => {
    const gameId = await createNewGame();
    if (gameId) {
      navigate(`/game/${gameId}`);
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

          <a href={import.meta.env.DEV ? 'http://localhost:8000' : '/'} className="local-game-link">
            ← {strings.localGame}
          </a>
        </div>
      </div>

      <style>{`
        .lobby-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 20px;
        }

        .lobby-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
          text-align: center;
        }

        .create-game-button {
          width: 100%;
          padding: 16px 24px;
          font-size: 18px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .create-game-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
        }

        .create-game-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          color: #ef4444;
          margin-top: 16px;
          font-size: 14px;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 24px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider span {
          padding: 0 16px;
          color: #94a3b8;
          font-size: 14px;
        }

        .local-game-link {
          color: #6366f1;
          text-decoration: none;
          font-weight: 500;
        }

        .local-game-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default Lobby;
