import React from 'react';
import ReactDOM from 'react-dom/client';
import { KartApp } from './KartApp.jsx';
import '../index.css';
import { registerSW } from 'virtual:pwa-register';
import { readPerfProbePref, setPerfProbe } from '../game/race/perfToggle.js';

const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
// Inside the iOS app (Capacitor) the bundle is already local and WKWebView
// has no service workers for the capacitor:// scheme — never register one.
const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());

if (!isLocalPreview && !isNativeApp) {
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
// imported: nobody who does not ask for it downloads the chunk. See
// devicePerfProbe.js for why this has to ship rather than live in the dev-only
// playtest harness. Inside the iOS app there is no address bar, so the race's
// pause menu can switch it on too, and that choice is remembered on the device
// (race/perfToggle.js).
if (readPerfProbePref()) setPerfProbe(true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KartApp />
  </React.StrictMode>
);
