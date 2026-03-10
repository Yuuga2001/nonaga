'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>{t.lastUpdated}</p>

      {t.sections.map((section, i) => (
        <section key={i} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{section.title}</h2>
          <p>{section.content}</p>
        </section>
      ))}
    </main>
  );
}

const EN = {
  back: 'Back',
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: March 2026',
  sections: [
    {
      title: 'Overview',
      content: 'Hexlide ("the App") is committed to protecting your privacy. This policy explains what data we collect and how we use it.',
    },
    {
      title: 'Data We Collect',
      content: 'The App generates a random anonymous identifier (UUID) stored locally on your device to identify you during online games. We do not collect personal information such as your name, email address, or location.',
    },
    {
      title: 'Game Data',
      content: 'When you play online, game session data (board state, moves, room codes) is temporarily stored on our servers (AWS DynamoDB). This data is automatically deleted after 24 hours.',
    },
    {
      title: 'Analytics & Tracking',
      content: 'We do not use any analytics, tracking, or advertising services. No cookies are used for tracking purposes.',
    },
    {
      title: 'Third-Party Services',
      content: 'The App uses AWS cloud services for hosting online game sessions. No personal data is shared with third parties.',
    },
    {
      title: 'Data Retention',
      content: 'Game session data is automatically deleted 24 hours after creation. The anonymous UUID is stored only on your device and can be cleared by uninstalling the app.',
    },
    {
      title: 'Children\'s Privacy',
      content: 'The App does not knowingly collect any personal information from children. The game is suitable for all ages.',
    },
    {
      title: 'Changes to This Policy',
      content: 'We may update this privacy policy from time to time. Changes will be reflected on this page with an updated date.',
    },
    {
      title: 'Contact',
      content: 'If you have questions about this privacy policy, please contact us through the Contact page.',
    },
  ],
};

const JA = {
  back: '戻る',
  title: 'プライバシーポリシー',
  lastUpdated: '最終更新: 2026年3月',
  sections: [
    {
      title: '概要',
      content: 'Hexlide（以下「本アプリ」）は、ユーザーのプライバシー保護に努めています。本ポリシーでは、収集するデータとその利用方法について説明します。',
    },
    {
      title: '収集するデータ',
      content: '本アプリは、オンライン対戦時にユーザーを識別するため、ランダムな匿名識別子（UUID）を端末上に生成・保存します。氏名、メールアドレス、位置情報などの個人情報は収集しません。',
    },
    {
      title: 'ゲームデータ',
      content: 'オンラインプレイ時、ゲームセッションデータ（盤面状態、手順、ルーム番号）がサーバー（AWS DynamoDB）に一時的に保存されます。このデータは作成から24時間後に自動的に削除されます。',
    },
    {
      title: 'アナリティクスとトラッキング',
      content: '本アプリでは、アナリティクス、トラッキング、広告サービスを一切使用しません。トラッキング目的のCookieも使用しません。',
    },
    {
      title: '第三者サービス',
      content: '本アプリは、オンラインゲームセッションのホスティングにAWSクラウドサービスを使用しています。個人データを第三者と共有することはありません。',
    },
    {
      title: 'データ保持期間',
      content: 'ゲームセッションデータは作成から24時間後に自動削除されます。匿名UUIDは端末にのみ保存され、アプリのアンインストールにより削除できます。',
    },
    {
      title: 'お子様のプライバシー',
      content: '本アプリは、お子様の個人情報を故意に収集しません。すべての年齢の方にお楽しみいただけるゲームです。',
    },
    {
      title: 'ポリシーの変更',
      content: '本プライバシーポリシーは必要に応じて更新されることがあります。変更は本ページに反映され、更新日が表示されます。',
    },
    {
      title: 'お問い合わせ',
      content: '本プライバシーポリシーに関するご質問は、お問い合わせページよりご連絡ください。',
    },
  ],
};
