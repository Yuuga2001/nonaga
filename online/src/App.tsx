import { Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import OnlineGame from './components/OnlineGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/game/:gameId" element={<OnlineGame />} />
    </Routes>
  );
}

export default App;
