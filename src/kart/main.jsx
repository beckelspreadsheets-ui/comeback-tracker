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

// ?perf=1 — on-device frame readout. Deliberately opt-in and dynamically
// imported: nobody who does not type the flag downloads the chunk. See
// devicePerfProbe.js for why this has to ship rather than live in the dev-only
// playtest harness.
if (new URLSearchParams(window.location.search).get('perf') === '1') {
  import('./devicePerfProbe.js').then(({ mountDevicePerfProbe }) => mountDevicePerfProbe());
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KartApp />
  </React.StrictMode>
);
