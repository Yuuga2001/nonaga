'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HowToPlayPage() {
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
        <Link href="/app" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
          {t.back}
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

      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{t.title}</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#4f46e5' }}>{t.objectiveTitle}</h2>
        <p>{t.objectiveDesc}</p>
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px',
          padding: '1rem', marginTop: '0.75rem',
        }}>
          <strong style={{ color: '#78350f' }}>{t.objectiveHighlight}</strong>
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#4f46e5' }}>{t.turnTitle}</h2>
        <p>{t.turnDesc}</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          <span style={{ background: '#1e293b', color: 'white', borderRadius: '50%', padding: '0.2rem 0.5rem', marginRight: '0.5rem', fontSize: '0.9rem' }}>1</span>
          {t.phase1Title}
        </h2>
        <p>{t.phase1Desc}</p>
        <ul style={{ paddingLeft: '1.2rem' }}>
          {t.phase1Rules.map((r, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{r}</li>)}
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          <span style={{ background: '#1e293b', color: 'white', borderRadius: '50%', padding: '0.2rem 0.5rem', marginRight: '0.5rem', fontSize: '0.9rem' }}>2</span>
          {t.phase2Title}
        </h2>
        <p>{t.phase2Desc}</p>
        <ul style={{ paddingLeft: '1.2rem' }}>
          {t.phase2Rules.map((r, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{r}</li>)}
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#4f46e5' }}>{t.tipsTitle}</h2>
        <ul style={{ paddingLeft: '1.2rem' }}>
          {t.tips.map((tip, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{tip}</li>)}
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#4f46e5' }}>{t.modesTitle}</h2>
        <ul style={{ paddingLeft: '1.2rem' }}>
          {t.modes.map((m, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{m}</li>)}
        </ul>
      </section>
    </main>
  );
}

const EN = {
  back: 'Back',
  title: 'How to Play Hexlide',
  objectiveTitle: 'Objective',
  objectiveDesc: 'Each player controls 3 pieces on a hexagonal board. Your goal is to connect all three of your pieces in an adjacent formation.',
  objectiveHighlight: 'Win by getting your 3 pieces adjacent to each other (line, triangle, or V-shape)!',
  turnTitle: 'Turn Structure',
  turnDesc: 'Each turn consists of two phases that must be completed in order:',
  phase1Title: 'Slide a Piece',
  phase1Desc: 'Select one of your pieces and slide it in one of six directions.',
  phase1Rules: [
    'Pieces slide until they hit the edge of the board or another piece',
    'You must move at least one space',
    'You cannot jump over other pieces',
  ],
  phase2Title: 'Move a Tile',
  phase2Desc: 'Select an empty tile (one with no piece on it) and move it to a new position.',
  phase2Rules: [
    'The new position must be adjacent to at least 2 existing tiles',
    'Moving the tile must not split the board into disconnected groups',
    'You cannot move a tile that has a piece on it',
  ],
  tipsTitle: 'Strategy Tips',
  tips: [
    'Use tile movement to reshape the board in your favor',
    'Try to separate your opponent\'s pieces to block their victory',
    'Keep your pieces close together while planning multiple paths to connect',
    'Watch out for your opponent\'s winning threats before making your move',
  ],
  modesTitle: 'Game Modes',
  modes: [
    'AI Mode: Play against the computer',
    '2-Player Mode: Take turns on the same device',
    'Online Mode: Play with others over the internet (cross-play between Web and iOS)',
  ],
};

const JA = {
  back: '戻る',
  title: 'Hexlideの遊び方',
  objectiveTitle: '目的',
  objectiveDesc: '各プレイヤーは六角形ボード上の3つのコマを操作します。自分の3つのコマをすべて隣接させることが目標です。',
  objectiveHighlight: '3つのコマを隣接させれば勝ち！（直線、三角形、V字のいずれでもOK）',
  turnTitle: 'ターンの流れ',
  turnDesc: '各ターンは以下の2つのフェーズを順番に行います：',
  phase1Title: 'コマを滑らせる',
  phase1Desc: '自分のコマを1つ選び、6方向のいずれかに滑らせます。',
  phase1Rules: [
    'コマはボードの端または他のコマにぶつかるまで滑ります',
    '最低1マス以上移動する必要があります',
    '他のコマを飛び越えることはできません',
  ],
  phase2Title: 'タイルを動かす',
  phase2Desc: '空きタイル（コマが乗っていないタイル）を選び、別の位置に移動します。',
  phase2Rules: [
    '移動先は既存のタイルに2つ以上隣接している必要があります',
    'タイルを動かした結果、盤面が分断されてはいけません',
    'コマが乗っているタイルは動かせません',
  ],
  tipsTitle: '戦略のポイント',
  tips: [
    'タイル移動を活用して盤面を自分に有利な形に変えましょう',
    '相手のコマを分断して勝利を阻止しましょう',
    '自分のコマを近づけつつ、複数の連結パスを計画しましょう',
    '手を打つ前に、相手の勝利パターンをチェックしましょう',
  ],
  modesTitle: 'ゲームモード',
  modes: [
    'AI対戦: コンピュータと対戦',
    'ふたりで対戦: 同じ端末で交互にプレイ',
    'オンライン対戦: インターネット経由で対戦（Web版・iOS版でクロスプレイ対応）',
  ],
};
