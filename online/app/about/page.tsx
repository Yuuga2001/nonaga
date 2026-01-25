import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NONAGAについて | 盤面が動く六角戦略ボードゲーム',
  description: 'NONAGAは盤面そのものを動かせる六角戦略ボードゲーム。ルール、遊び方、勝利条件を紹介します。',
  openGraph: {
    type: 'article',
    url: 'https://nonaga.riverapp.jp/about/',
    title: 'NONAGAについて | 盤面が動く六角戦略ボードゲーム',
    description: '盤面そのものを動かせる六角戦略ボードゲーム、NONAGAのルールと特徴を紹介。',
    images: [{ url: 'https://nonaga.riverapp.jp/og-image.png', width: 1200, height: 630 }],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NONAGAについて | 盤面が動く六角戦略ボードゲーム',
    description: '盤面そのものを動かせる六角戦略ボードゲーム、NONAGAのルールと特徴を紹介。',
    images: ['https://nonaga.riverapp.jp/og-image.png'],
  },
  alternates: {
    canonical: 'https://nonaga.riverapp.jp/about/',
    languages: {
      ja: 'https://nonaga.riverapp.jp/about/',
      en: 'https://nonaga.riverapp.jp/en/about/',
    },
  },
};

export default function AboutPage() {
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
        <Link href="/" style={{ color: '#4f46e5', textDecoration: 'none' }}>ゲームに戻る</Link>
        <Link href="/en/about" style={{ color: '#4f46e5', textDecoration: 'none' }}>English</Link>
      </nav>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', marginTop: '1.5rem' }}>NONAGAについて</h1>
      <p style={{ fontSize: '1.05rem', color: '#1e293b' }}>
        NONAGAは、六角形（ヘックス）の盤面を動かしながら戦う2人対戦の戦略ボードゲームです。
        コマの移動に加えて盤面タイル自体も動かせるため、毎手が読み合いになるのが特徴です。
      </p>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>ゲームの特徴</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li style={{ marginBottom: '0.4rem' }}>ブラウザで今すぐ無料プレイ可能</li>
        <li style={{ marginBottom: '0.4rem' }}>AI対戦モード搭載 - 一人でも楽しめる</li>
        <li style={{ marginBottom: '0.4rem' }}>2人対戦モード - 友達や家族と対戦</li>
        <li style={{ marginBottom: '0.4rem' }}>スマートフォン・タブレット・PCに対応</li>
        <li style={{ marginBottom: '0.4rem' }}>シンプルなルールで奥深い戦術性</li>
      </ul>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>遊び方</h2>
      <p>各プレイヤーは3つのコマを持ち、それらを連結させることで勝利します。1ターンは2つのフェーズから構成されます：</p>
      <ol style={{ paddingLeft: '1.2rem' }}>
        <li style={{ marginBottom: '0.4rem' }}>コマを選んで端まで滑らせる</li>
        <li style={{ marginBottom: '0.4rem' }}>空いているタイルを別の位置へ移動する</li>
      </ol>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>勝利条件</h2>
      <p>自分の3つのコマすべてが隣接した状態（線状、三角形、V字など）を作ると勝利です。</p>

      <h2 style={{ fontSize: '1.4rem', marginTop: '2rem' }}>戦略のポイント</h2>
      <p>タイル配置を変えることで盤面全体をコントロールできます。相手のコマを分断したり、自分のコマを近づけたりする戦略的な判断が重要です。</p>
    </main>
  );
}
