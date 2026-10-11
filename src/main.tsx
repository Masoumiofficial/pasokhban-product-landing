import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted fonts (bundled into assets/; no CDN, no Google Fonts).
import '@fontsource-variable/vazirmatn/wght.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './styles/global.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
