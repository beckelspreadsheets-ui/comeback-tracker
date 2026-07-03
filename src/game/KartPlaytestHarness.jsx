// A2: minimal harness mounting the SHIPPED racer for FPS instrumentation.
// No app shell, no router, no cloud sync — the component reads
// ?raceAutoplay/?track/?character/?kart from the URL itself.
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ComebackCityThreeKartRace } from './ComebackCityThreeKartRace.jsx';

const KartPlaytestHarness = () => (
  <div style={{ height: '100vh', width: '100vw' }}>
    <ComebackCityThreeKartRace mode="race" />
  </div>
);

createRoot(document.getElementById('root')).render(<KartPlaytestHarness />);
window.__kartHarnessReady = true;
