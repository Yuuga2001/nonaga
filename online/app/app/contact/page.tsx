'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
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
      <p style={{ marginBottom: '2rem' }}>{t.description}</p>

      <a
        href="https://forms.gle/oUp6JhYhTW7TF4qY6"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          borderRadius: '12px',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '1rem',
        }}
      >
        {t.formButton}
      </a>

      <p style={{ marginTop: '2rem', color: '#64748b', fontSize: '0.9rem' }}>{t.note}</p>
    </main>
  );
}

const EN = {
  back: 'Back',
  title: 'Contact Us',
  description: 'Have questions, feedback, or found a bug? We\'d love to hear from you. Please fill out the form below and we\'ll get back to you as soon as possible.',
  formButton: 'Open Contact Form',
  note: 'We typically respond within a few business days.',
};

const JA = {
  back: '戻る',
  title: 'お問い合わせ',
  description: 'ご質問、ご意見、バグ報告などがございましたら、以下のフォームよりお気軽にお問い合わせください。',
  formButton: 'お問い合わせフォームを開く',
  note: '通常、数営業日以内にご返信いたします。',
};
