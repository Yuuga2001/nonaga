import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About NONAGA | Move-the-board Hex Strategy Game',
  description: 'Learn the rules, win conditions, and unique board-moving mechanics of NONAGA, a tactical hex strategy game.',
  openGraph: {
    type: 'article',
    url: 'https://nonaga.riverapp.jp/en/about/',
    title: 'About NONAGA | Move-the-board Hex Strategy Game',
    description: 'Learn the rules, win conditions, and unique board-moving mechanics of NONAGA.',
    images: [{ url: 'https://nonaga.riverapp.jp/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About NONAGA | Move-the-board Hex Strategy Game',
    description: 'Learn the rules, win conditions, and unique board-moving mechanics of NONAGA.',
    images: ['https://nonaga.riverapp.jp/og-image.png'],
  },
  alternates: {
    canonical: 'https://nonaga.riverapp.jp/en/about/',
    languages: {
      ja: 'https://nonaga.riverapp.jp/about/',
      en: 'https://nonaga.riverapp.jp/en/about/',
    },
  },
};

export default function AboutPageEN() {
  return (
    <main style={{
      maxWidth: '860px',
      margin: '0 auto',
      padding: '2.5rem 1.5rem 4rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      background: '#f8fafc',
      color: '#0f172a',
      lineHeight: 1.8,
      minHeight: '100vh',
    }}>
      <nav style={{ display: 'flex', gap: '1rem', fontWeight: 600, fontSize: '0.9rem' }}>
        <Link href="/?lang=en" style={{ color: '#4f46e5', textDecoration: 'none' }}>Back to game</Link>
        <Link href="/about" style={{ color: '#4f46e5', textDecoration: 'none' }}>日本語</Link>
      </nav>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', marginTop: '1.5rem' }}>About NONAGA</h1>
      <p style={{ fontSize: '1.05rem', color: '#1e293b' }}>
        NONAGA is a tactical 2-player hex strategy game. You can move the board tiles themselves,
        creating a constantly shifting battlefield that rewards foresight and positioning.
      </p>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>Key Features</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li style={{ marginBottom: '0.4rem' }}>Play instantly in your browser for free</li>
        <li style={{ marginBottom: '0.4rem' }}>AI opponent mode for solo play</li>
        <li style={{ marginBottom: '0.4rem' }}>2-player local mode for playing with friends</li>
        <li style={{ marginBottom: '0.4rem' }}>Online multiplayer - share a URL to play with anyone</li>
        <li style={{ marginBottom: '0.4rem' }}>Responsive on mobile, tablet, and desktop</li>
        <li style={{ marginBottom: '0.4rem' }}>Simple rules with deep strategic depth</li>
      </ul>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>How to Play</h2>
      <p>Each player controls three pieces. You win by connecting all three. Each turn has two phases:</p>
      <ol style={{ paddingLeft: '1.2rem' }}>
        <li style={{ marginBottom: '0.4rem' }}>Slide a piece in one of six directions until it hits an obstacle</li>
        <li style={{ marginBottom: '0.4rem' }}>Move an empty tile to a new position (must touch at least 2 existing tiles)</li>
      </ol>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>Win Condition</h2>
      <p>Connect your three pieces in any adjacent formation - a line, triangle, or V-shape.</p>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>Strategy Tips</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li style={{ marginBottom: '0.4rem' }}>Reposition tiles to control the board flow</li>
        <li style={{ marginBottom: '0.4rem' }}>Try to separate your opponent&apos;s pieces to block their victory</li>
        <li style={{ marginBottom: '0.4rem' }}>Bring your pieces closer together while anticipating your opponent&apos;s moves</li>
      </ul>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>Game Modes</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li style={{ marginBottom: '0.4rem' }}><strong>vs AI</strong>: Play against the computer. First/second player is randomly determined</li>
        <li style={{ marginBottom: '0.4rem' }}><strong>2 Players</strong>: Take turns on the same device</li>
        <li style={{ marginBottom: '0.4rem' }}><strong>Online Match</strong>: Share a URL to play with remote opponents. Rematch feature included</li>
      </ul>
    </main>
  );
}
