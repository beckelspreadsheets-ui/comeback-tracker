import assert from 'node:assert/strict';
import { BACKUP_KEYS, backupChanged, restoreMissing, startProgressBackup } from '../src/kart/progressBackup.js';

const makeStorage = (seed = {}) => {
  const map = new Map(Object.entries(seed));
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), map, setItem: (key, value) => map.set(key, String(value)) };
};
const makePreferences = (seed = {}) => {
  const map = new Map(Object.entries(seed));
  return { get: async ({ key }) => ({ value: map.has(key) ? map.get(key) : null }), map, set: async ({ key, value }) => void map.set(key, value) };
};

// Web data cleared: every backed-up key comes back.
{
  const storage = makeStorage();
  const preferences = makePreferences({ 'cc-kart-wallet': '{"coins":120}', 'cc-kart-paints': '{"owned":["stock","ice-cyan"]}', 'cc-kart-mirror-unlocked': '1' });
  const restored = await restoreMissing(storage, preferences);
  assert.deepEqual(restored, ['cc-kart-wallet', 'cc-kart-paints', 'cc-kart-mirror-unlocked']);
  assert.equal(storage.getItem('cc-kart-wallet'), '{"coins":120}');
  assert.equal(storage.getItem('cc-kart-results'), null, 'nothing invented for a key with no copy');
}
// localStorage has a value: it wins over an older copy.
{
  const storage = makeStorage({ 'cc-kart-wallet': '{"coins":300}' });
  const preferences = makePreferences({ 'cc-kart-wallet': '{"coins":120}' });
  assert.deepEqual(await restoreMissing(storage, preferences), []);
  assert.equal(storage.getItem('cc-kart-wallet'), '{"coins":300}');
}
// Backup writes only what changed, and never writes a missing key.
{
  const storage = makeStorage({ 'cc-kart-wallet': '{"coins":5}' });
  const preferences = makePreferences();
  const last = new Map();
  assert.deepEqual(await backupChanged(storage, preferences, last), ['cc-kart-wallet']);
  assert.deepEqual(await backupChanged(storage, preferences, last), []);
  storage.setItem('cc-kart-wallet', '{"coins":9}');
  storage.setItem('cc-kart-ghost-v2-x', 'big');
  assert.deepEqual(await backupChanged(storage, preferences, last), ['cc-kart-wallet']);
  assert.equal(preferences.map.get('cc-kart-wallet'), '{"coins":9}');
  assert.equal(preferences.map.has('cc-kart-ghost-v2-x'), false, 'ghosts are not backed up');
}
// A failing plugin never throws into the launch.
{
  const storage = makeStorage();
  const broken = { get: async () => { throw new Error('bridge down'); }, set: async () => { throw new Error('bridge down'); } };
  assert.deepEqual(await restoreMissing(storage, broken), []);
  assert.deepEqual(await backupChanged(makeStorage({ 'cc-kart-wallet': 'x' }), broken, new Map()), []);
}
// On the web (no native plugin) it does nothing.
assert.deepEqual(await startProgressBackup({ localStorage: makeStorage() }), { active: false, restored: [] });
// In the app: restore first, then a first copy.
{
  const storage = makeStorage({ 'cc-kart-paints': '{"owned":["stock"]}' });
  const preferences = makePreferences({ 'cc-kart-wallet': '{"coins":77}' });
  const timers = [];
  const windowRef = {
    Capacitor: { isNativePlatform: () => true, isPluginAvailable: (name) => name === 'Preferences', nativePromise: (plugin, method, options) => (plugin === 'Preferences' ? preferences[method](options) : Promise.reject(new Error('no plugin'))) },
    addEventListener: () => {},
    document: { addEventListener: () => {}, visibilityState: 'visible' },
    localStorage: storage,
    setInterval: (fn) => timers.push(fn),
    setTimeout: () => 0,
  };
  const result = await startProgressBackup(windowRef);
  assert.deepEqual(result, { active: true, restored: ['cc-kart-wallet'] });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(preferences.map.get('cc-kart-paints'), '{"owned":["stock"]}');
  assert.equal(timers.length, 1);
}
assert.ok(BACKUP_KEYS.includes('cc-kart-wallet') && BACKUP_KEYS.includes('cc-kart-paints') && BACKUP_KEYS.includes('cc-kart-mirror-unlocked'));
console.log('PASS: progress restore after cleared web data, localStorage precedence, changed-only backup, plugin failure, web no-op');
