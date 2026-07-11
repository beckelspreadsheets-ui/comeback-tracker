import React from 'react';
import ReactDOM from 'react-dom/client';
import { KartApp } from './KartApp.jsx';
import '../index.css';
import { registerSW } from 'virtual:pwa-register';

const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

if (!isLocalPreview) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      console.log('Penguin Kart — ready to race offline');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KartApp />
  </React.StrictMode>
);
