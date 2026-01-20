import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { configureAmplify } from './lib/amplifyConfig';
import './styles/app.css';

// Error Boundary for catching initialization errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>エラーが発生しました</h1>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            トップページに戻る
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Configure Amplify with error handling
try {
  configureAmplify();
} catch (e) {
  console.error('Failed to configure Amplify:', e);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename="/online">
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
