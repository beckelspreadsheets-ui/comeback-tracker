// A2: minimal harness mounting the SHIPPED racer for FPS instrumentation.
// No app shell, no router, no cloud sync. ?track/?character/?kart are read
// HERE and passed as props — the shipped component is prop-only since the
// W1 fix (a URL param must never beat a cup-select pick); ?raceAutoplay is
// still read by the component itself.
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ComebackCityThreeKartRace } from './ComebackCityThreeKartRace.jsx';

const query = new URLSearchParams(window.location.search);

const KartPlaytestHarness = () => (
  <div style={{ height: '100vh', width: '100vw' }}>
    <ComebackCityThreeKartRace
      character={query.get('character') || undefined}
      kart={query.get('kart') || undefined}
      mode="race"
      track={query.get('track') || undefined}
    />
  </div>
);

createRoot(document.getElementById('root')).render(<KartPlaytestHarness />);
window.__kartHarnessReady = true;
