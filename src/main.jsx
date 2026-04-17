import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update service worker
registerSW({
  onNeedRefresh() {
    // Could show a toast here if we want to prompt manual refresh
  },
  onOfflineReady() {
    console.log('Comeback Tracker — ready to train offline');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
