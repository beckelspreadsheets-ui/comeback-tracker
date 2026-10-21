import assert from 'node:assert/strict';
import {
  SESSION_OPEN_KEY,
  SESSION_UNCLEAN_KEY,
  beginRaceSession,
  resumeRaceSession,
  suspendRaceSession,
} from '../src/game/race/sessionHealth.js';

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    removeItem: (key) => map.delete(key),
    setItem: (key, value) => map.set(key, String(value)),
  };
};

// A first race on a fresh install is not a crash.
{
  const storage = memoryStorage();
  assert.deepEqual(beginRaceSession(storage), { safeMode: false, uncleanExits: 0 });
  assert.notEqual(storage.getItem(SESSION_OPEN_KEY), null);
}

// Clean close, then a new race: still no safe mode.
{
  const storage = memoryStorage();
  beginRaceSession(storage);
  suspendRaceSession(storage);
  assert.deepEqual(beginRaceSession(storage), { safeMode: false, uncleanExits: 0 });
}

// The marker survives (web process killed mid-race): next race is safe mode
// and the count goes up, and keeps counting across repeats.
{
  const storage = memoryStorage();
  beginRaceSession(storage);
  assert.deepEqual(beginRaceSession(storage), { safeMode: true, uncleanExits: 1 });
  assert.deepEqual(beginRaceSession(storage), { safeMode: true, uncleanExits: 2 });
  assert.equal(storage.getItem(SESSION_UNCLEAN_KEY), '2');
}

// Backgrounding clears the marker, so iOS reclaiming a background app does not
// count as a crash; coming back re-arms it.
{
  const storage = memoryStorage();
  beginRaceSession(storage);
  suspendRaceSession(storage);
  assert.equal(storage.getItem(SESSION_OPEN_KEY), null);
  resumeRaceSession(storage);
  assert.notEqual(storage.getItem(SESSION_OPEN_KEY), null);
}

// Missing or throwing storage never breaks the race.
{
  assert.deepEqual(beginRaceSession(null), { safeMode: false, uncleanExits: 0 });
  const throwing = {
    getItem() {
      throw new Error('denied');
    },
    removeItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
  };
  assert.deepEqual(beginRaceSession(throwing), { safeMode: false, uncleanExits: 0 });
  suspendRaceSession(throwing);
  resumeRaceSession(throwing);
}

console.log('PASS session health: 5 cases');
