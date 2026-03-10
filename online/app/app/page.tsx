'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AppLandingPage() {
  const [lang, setLang] = useState<'en' | 'ja'>('en');
  const t = lang === 'ja' ? JA : EN;

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
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
          {t.backToGame}
        </Link>
        <button
          onClick={() => setLang(lang === 'en' ? 'ja' : 'en')}
          style={{
            background: 'white', border: '1px solid #e2e8f0', color: '#4f46e5',
            fontSize: '0.85rem', fontWeight: 700, padding: '0.5rem 1.25rem',
            borderRadius: '9999px', cursor: 'pointer',
          }}
        >
          {lang === 'en' ? '日本語' : 'English'}
        </button>
      </nav>

      <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
        Hexlide
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '2rem' }}>{t.tagline}</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{t.whatIsTitle}</h2>
        <p>{t.whatIsDesc}</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{t.featuresTitle}</h2>
        <ul style={{ paddingLeft: '1.2rem' }}>
          {t.features.map((f, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{f}</li>)}
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{t.howToPlayTitle}</h2>
        <ol style={{ paddingLeft: '1.2rem' }}>
          {t.howToPlay.map((s, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{s}</li>)}
        </ol>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{t.victoryTitle}</h2>
        <p>{t.victoryDesc}</p>
      </section>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
        <Link href="/app/privacy" style={{ color: '#4f46e5', fontSize: '0.9rem' }}>{t.privacy}</Link>
        <Link href="/app/contact" style={{ color: '#4f46e5', fontSize: '0.9rem' }}>{t.contact}</Link>
        <Link href="/app/how-to-play" style={{ color: '#4f46e5', fontSize: '0.9rem' }}>{t.howToPlayLink}</Link>
      </div>
    </main>
  );
}

const EN = {
  backToGame: 'Back to game',
  tagline: 'A move-the-board hex strategy game',
  whatIsTitle: 'What is Hexlide?',
  whatIsDesc: 'Hexlide is a tactical 2-player hex strategy game. Slide your pieces and move the board tiles themselves to outmaneuver your opponent on a constantly shifting battlefield.',
  featuresTitle: 'Features',
  features: [
    'Play instantly in your browser for free',
    'AI opponent for solo play',
    '2-player local mode',
    'Online multiplayer with cross-play (Web & iOS)',
    'Simple rules with deep strategic depth',
  ],
  howToPlayTitle: 'How to Play',
  howToPlay: [
    'Slide a piece in one of six directions until it hits an obstacle',
    'Move an empty tile to a new position (must touch at least 2 existing tiles)',
  ],
  victoryTitle: 'Win Condition',
  victoryDesc: 'Connect your three pieces in any adjacent formation — a line, triangle, or V-shape.',
  privacy: 'Privacy Policy',
  contact: 'Contact Us',
  howToPlayLink: 'How to Play',
};

const JA = {
  backToGame: 'ゲームに戻る',
  tagline: '盤面が動く六角戦略ボードゲーム',
  whatIsTitle: 'Hexlideとは？',
  whatIsDesc: 'Hexlideは、六角形（ヘックス）の盤面を動かしながら戦う2人対戦の戦略ボードゲームです。コマの移動に加えて盤面タイル自体も動かせるため、毎手が読み合いになるのが特徴です。',
  featuresTitle: '特徴',
  features: [
    'ブラウザで今すぐ無料プレイ可能',
    'AI対戦モード搭載 - 一人でも楽しめる',
    '2人対戦モード - 友達や家族と対戦',
    'オンライン対戦 - Web版・iOS版でクロスプレイ対応',
    'シンプルなルールで奥深い戦術性',
  ],
  howToPlayTitle: '遊び方',
  howToPlay: [
    'コマを選んで端まで滑らせる（6方向のいずれかに、障害物にぶつかるまで移動）',
    '空いているタイルを別の位置へ移動する（移動先は既存タイルに2つ以上接している必要あり）',
  ],
  victoryTitle: '勝利条件',
  victoryDesc: '自分の3つのコマすべてが隣接した状態（線状、三角形、V字など）を作ると勝利です。',
  privacy: 'プライバシーポリシー',
  contact: 'お問い合わせ',
  howToPlayLink: '遊び方',
};
