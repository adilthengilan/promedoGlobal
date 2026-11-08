import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const isIgnorable = (err: any, msgStr?: string) => {
    const msg = (err?.message || msgStr || String(err || '')).toLowerCase();
    const name = (err?.name || '').toLowerCase();
    return (
      name === 'aborterror' ||
      msg.includes('signal is aborted') ||
      msg.includes('aborterror') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('load failed') ||
      msg.includes('missing or insufficient permissions')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isIgnorable(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Global] Handled background network/auth notice in unhandledrejection:', event.reason?.message || event.reason);
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isIgnorable(event.error, event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Global] Handled window network/auth notice:', event.message || event.error);
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
