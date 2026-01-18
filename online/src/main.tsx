import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { configureAmplify } from './lib/amplifyConfig';
import './styles/app.css';

// Configure Amplify
configureAmplify();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/online">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
