import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ArcadeRace3D } from './ArcadeRace3D.jsx';
import { RACE_TRACKS } from './raceTracks.js';

const profile = {
  avatar: {
    accent: '#2cc8ff',
    chassis: '#ef4334',
    suit: '#202837',
  },
  level: 24,
  race: {
    credits: 0,
    garage: {
      inventory: {
        boost: 99,
        rocket: 99,
        shield: 99,
      },
    },
  },
};

const query = new URLSearchParams(window.location.search);
const trackKey = query.get('raceTrack') || RACE_TRACKS[0].key;
const track = RACE_TRACKS.find((item) => item.key === trackKey) || RACE_TRACKS[0];
const raceIndex = Number(query.get('raceIndex') || 1);
const raceMode = query.get('raceMode') || 'free-switch';

const Harness = () => {
  const [result, setResult] = useState(null);
  const inventory = useMemo(() => profile.race.garage.inventory, []);

  useEffect(() => {
    window.__raceHarnessReady = true;
    window.__raceHarnessTrack = track.key;
    window.__raceHarnessMode = raceMode;
    window.__raceHarnessRaceIndex = raceIndex;
  }, []);

  const handleFinish = (nextResult) => {
    const merged = {
      ...nextResult,
      harness: {
        mode: raceMode,
        raceIndex,
        trackKey: track.key,
      },
    };
    window.__raceHarnessFinish = merged;
    setResult(merged);
  };

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Automated race playtest
            </p>
            <h1 className="font-display text-3xl leading-none">{track.name}</h1>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
            {raceMode} / run {raceIndex}
          </div>
        </div>

        <ArcadeRace3D
          command={null}
          inventory={inventory}
          onFinish={handleFinish}
          onInventoryUse={() => {}}
          profile={profile}
          runId={`${track.key}-${raceMode}-${raceIndex}`}
          track={track}
        />

        <pre
          className="mt-4 max-h-72 overflow-auto border border-bone/[0.08] bg-bone/[0.025] p-3 font-mono text-[11px] text-stone"
          data-testid="race-result"
        >
          {result ? JSON.stringify(result, null, 2) : 'running'}
        </pre>
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')).render(<Harness />);
