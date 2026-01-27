import { Suspense } from 'react';
import LocalGameClient from '@/components/LocalGameClient';

export default function LocalGamePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
      <LocalGameClient />
    </Suspense>
  );
}
