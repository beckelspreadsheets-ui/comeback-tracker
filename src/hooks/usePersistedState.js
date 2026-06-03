import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_FOOD } from '../lib/program.js';

export const STORAGE_KEY = 'comeback-tracker-v1';
export const SYNC_META_KEY = 'comeback-tracker-sync-meta-v1';
export const SCHEMA_VERSION = 5;

const LOCAL_SAVE_DEBOUNCE_MS = 200;
const CLOUD_SAVE_DEBOUNCE_MS = 1500;
const PROFILE_POLL_MS = 30_000;

const DEFAULT_GAME = {
  homeMode: 'world',
  hub: {
    onboardingSeen: false,
    lastSpawn: { x: 0, z: -42, heading: 0 },
    discoveredDistricts: [],
    completedHubActions: [],
    cityXp: 0,
    reducedMotion: false,
    metrics: {
      bestFirstActionMs: null,
      citySessions: 0,
      districtEntriesFromCity: 0,
      firstCitySessionAt: null,
      lastDistrictKey: null,
      lastFirstActionMs: null,
      lastCitySessionAt: null,
      raceStartsFromCity: 0,
      returnSessions: 0,
      trackerActionsCompletedFromCity: 0,
      trackerFeedbackEvents: 0,
    },
    cosmetics: {
      kartPaint: 'nova',
      trailColor: '#ffd34f',
      bannerSet: 'classic',
    },
  },
};

const makeDefaultGame = () => ({
  ...DEFAULT_GAME,
  hub: {
    ...DEFAULT_GAME.hub,
    lastSpawn: { ...DEFAULT_GAME.hub.lastSpawn },
    discoveredDistricts: [],
    completedHubActions: [],
    metrics: { ...DEFAULT_GAME.hub.metrics },
    cosmetics: { ...DEFAULT_GAME.hub.cosmetics },
  },
});

const STATUS_LABELS = {
  checking: 'Checking sync',
  synced: 'Synced',
  saving: 'Saving...',
  offline: 'Offline / local changes',
  conflict: 'Conflict',
  'local-only': 'Local only',
  'needs-decision': 'Sync paused',
  error: 'Sync error',
};

export const makeDefaultState = () => ({
  schemaVersion: SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
  oneRMs: {},
  currentWeek: 1,
  logs: {},
  metrics: [],
  epleyRows: Array.from({ length: 6 }, () => ({ name: '', wt: '', reps: '', rir: '' })),
  food: DEFAULT_FOOD,
  game: makeDefaultGame(),
});

// v1 -> v2: add `food` branch with preset defaults. Legacy state untouched.
const migrateV1toV2 = (state) => {
  const migrated = { ...state };
  if (!migrated.food) {
    migrated.food = DEFAULT_FOOD;
  } else {
    migrated.food = {
      targets: { ...DEFAULT_FOOD.targets, ...(migrated.food.targets || {}) },
      library: migrated.food.library || [],
      log: migrated.food.log || {},
    };
  }
  migrated.schemaVersion = 2;
  return migrated;
};

// v2 -> v3: introduce unit-aware library items and entries.
const migrateV2toV3 = (state) => {
  const migrated = { ...state };
  const food = migrated.food || DEFAULT_FOOD;
  const library = (food.library || []).map((item) =>
    item.unit ? item : { ...item, unit: 'serving' }
  );
  const log = {};
  for (const [dateKey, day] of Object.entries(food.log || {})) {
    const nextDay = {};
    for (const [bucket, entries] of Object.entries(day || {})) {
      nextDay[bucket] = (entries || []).map((entry) => {
        if (entry.unit && entry.amount != null) return entry;
        const { servings, ...rest } = entry;
        return {
          ...rest,
          amount: Number(entry.amount ?? servings) || 1,
          unit: entry.unit || 'serving',
        };
      });
    }
    log[dateKey] = nextDay;
  }
  migrated.food = { ...food, library, log };
  migrated.schemaVersion = 3;
  return migrated;
};

// v3 -> v4: add template storage for one-tap repeat meals.
const migrateV3toV4 = (state) => {
  const migrated = { ...state };
  const food = migrated.food || DEFAULT_FOOD;
  migrated.food = {
    ...food,
    templates: food.templates || [],
  };
  migrated.schemaVersion = 4;
  return migrated;
};

// v4 -> v5: add playable Comeback City hub state while preserving race/avatar data.
const migrateV4toV5 = (state) => {
  const migrated = { ...state };
  const defaultGame = makeDefaultGame();
  migrated.game = {
    ...defaultGame,
    ...(migrated.game || {}),
    hub: {
      ...defaultGame.hub,
      ...(migrated.game?.hub || {}),
      cosmetics: {
        ...defaultGame.hub.cosmetics,
        ...(migrated.game?.hub?.cosmetics || {}),
      },
    },
  };
  migrated.schemaVersion = 5;
  return migrated;
};

export const migrate = (parsed) => {
  let state = { ...parsed };
  const version = state.schemaVersion || 1;
  if (version < 2) state = migrateV1toV2(state);
  if ((state.schemaVersion || 1) < 3) state = migrateV2toV3(state);
  if ((state.schemaVersion || 1) < 4) state = migrateV3toV4(state);
  if ((state.schemaVersion || 1) < 5) state = migrateV4toV5(state);
  state.schemaVersion = SCHEMA_VERSION;
  return state;
};

export const normalizeState = (rawState) => {
  const defaults = makeDefaultState();
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) return defaults;
  const state =
    rawState.schemaVersion === SCHEMA_VERSION ? { ...rawState } : migrate(rawState);
  const food = state.food || defaults.food;
  return {
    ...defaults,
    ...state,
    settings: { ...defaults.settings, ...(state.settings || {}) },
    oneRMs: { ...defaults.oneRMs, ...(state.oneRMs || {}) },
    logs: state.logs || {},
    metrics: state.metrics || [],
    epleyRows: Array.isArray(state.epleyRows) ? state.epleyRows : defaults.epleyRows,
    food: {
      ...defaults.food,
      ...food,
      targets: {
        ...defaults.food.targets,
        ...(food.targets || {}),
        offsets: {
          ...defaults.food.targets.offsets,
          ...(food.targets?.offsets || {}),
        },
      },
      library: food.library || [],
      log: food.log || {},
      templates: food.templates || [],
    },
    game: {
      ...defaults.game,
      ...(state.game || {}),
      hub: {
        ...defaults.game.hub,
        ...(state.game?.hub || {}),
        lastSpawn: {
          ...defaults.game.hub.lastSpawn,
          ...(state.game?.hub?.lastSpawn || {}),
        },
        discoveredDistricts: Array.isArray(state.game?.hub?.discoveredDistricts)
          ? state.game.hub.discoveredDistricts
          : defaults.game.hub.discoveredDistricts,
        completedHubActions: Array.isArray(state.game?.hub?.completedHubActions)
          ? state.game.hub.completedHubActions
          : defaults.game.hub.completedHubActions,
        metrics: {
          ...defaults.game.hub.metrics,
          ...(state.game?.hub?.metrics || {}),
        },
        cosmetics: {
          ...defaults.game.hub.cosmetics,
          ...(state.game?.hub?.cosmetics || {}),
        },
      },
    },
    schemaVersion: SCHEMA_VERSION,
  };
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    console.warn('Failed to load saved state, starting fresh:', err);
    return makeDefaultState();
  }
};

const readSyncMeta = () => {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const profileLabel = (profile) => profile?.displayName || profile?.userId || 'Profile';

const statusLabel = (status) => STATUS_LABELS[status] || 'Sync';

const profileWithState = (profiles, result) => {
  const nextProfile = {
    userId: result.userId,
    displayName: result.displayName,
    rev: result.rev,
    updatedAt: result.updatedAt,
    hasState: true,
  };
  const found = profiles.some((profile) => profile.userId === result.userId);
  return found
    ? profiles.map((profile) => (profile.userId === result.userId ? nextProfile : profile))
    : [...profiles, nextProfile];
};

const apiJson = async (path, options = {}) => {
  const res = await fetch(path, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `sync-http-${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const hasMeaningfulData = (state) => {
  if (Object.keys(state.logs || {}).length > 0) return true;
  if (Object.values(state.oneRMs || {}).some((value) => value != null && value !== '')) return true;
  if (
    (state.metrics || []).some((row) =>
      ['date', 'bw', 'waist', 'arm', 'thigh', 'notes'].some(
        (key) => row?.[key] != null && row[key] !== ''
      )
    )
  ) {
    return true;
  }

  const food = state.food || {};
  if ((food.library || []).length > 0 || (food.templates || []).length > 0) return true;
  return Object.values(food.log || {}).some((day) =>
    Object.values(day || {}).some((entries) => Array.isArray(entries) && entries.length > 0)
  );
};

export const usePersistedState = () => {
  const [state, setState] = useState(loadState);
  const [syncState, setSyncState] = useState(() => ({
    status: 'checking',
    statusLabel: statusLabel('checking'),
    user: null,
    profiles: [],
    viewedUserId: null,
    viewedState: null,
    viewedRev: null,
    viewedLoading: false,
    decision: null,
    conflict: null,
    error: null,
    meta: readSyncMeta(),
  }));

  const saveTimer = useRef(null);
  const pushTimer = useRef(null);
  const stateRef = useRef(state);
  const syncRef = useRef(syncState);
  const metaRef = useRef(syncState.meta);
  const initialStateJson = useRef(JSON.stringify(state));
  const preBootstrapDirty = useRef(false);
  const bootstrapped = useRef(false);
  const applyingCloudState = useRef(false);
  const pushing = useRef(false);
  const pendingPush = useRef(false);
  const pushLocalRef = useRef(null);

  const patchSync = useCallback((patch) => {
    setSyncState((current) => {
      const nextPatch = typeof patch === 'function' ? patch(current) : patch;
      const nextStatus = nextPatch.status || current.status;
      return {
        ...current,
        ...nextPatch,
        status: nextStatus,
        statusLabel: nextPatch.statusLabel || statusLabel(nextStatus),
      };
    });
  }, []);

  const persistSyncMeta = useCallback((nextMeta) => {
    metaRef.current = nextMeta;
    try {
      if (nextMeta) {
        localStorage.setItem(SYNC_META_KEY, JSON.stringify(nextMeta));
      } else {
        localStorage.removeItem(SYNC_META_KEY);
      }
    } catch (err) {
      console.warn('Failed to persist sync metadata:', err);
    }
    patchSync({ meta: nextMeta });
  }, [patchSync]);

  const schedulePush = useCallback((delay = CLOUD_SAVE_DEBOUNCE_MS) => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      patchSync({ status: 'offline' });
      return;
    }
    pushTimer.current = setTimeout(() => {
      pushLocalRef.current?.();
    }, delay);
  }, [patchSync]);

  const fetchMe = useCallback(async () => {
    const data = await apiJson('/api/sync/me');
    patchSync((current) => ({
      user: data.user,
      profiles: data.profiles || [],
      viewedUserId: current.viewedUserId || data.user.userId,
      error: null,
    }));
    return data;
  }, [patchSync]);

  const fetchCloudState = useCallback((userId) => {
    const encoded = encodeURIComponent(userId);
    return apiJson(`/api/sync/state?userId=${encoded}`);
  }, []);

  const markConflict = useCallback((conflict) => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    patchSync({
      status: 'conflict',
      decision: null,
      conflict,
    });
  }, [patchSync]);

  const applyOwnCloudState = useCallback((cloud) => {
    if (!cloud?.state) return;
    const now = Date.now();
    applyingCloudState.current = true;
    setState(normalizeState(cloud.state));
    persistSyncMeta({
      userId: cloud.userId,
      cloudRev: cloud.rev,
      lastCloudUpdatedAt: cloud.updatedAt,
      lastPulledAt: now,
      lastPushedAt: metaRef.current?.lastPushedAt || null,
      dirtySince: null,
    });
    patchSync((current) => ({
      status: 'synced',
      decision: null,
      conflict: null,
      error: null,
      profiles: profileWithState(current.profiles, cloud),
    }));
  }, [patchSync, persistSyncMeta]);

  const pushLocal = useCallback(async ({ force = false } = {}) => {
    const currentSync = syncRef.current;
    if (!currentSync.user || currentSync.status === 'local-only') return;
    if (currentSync.status === 'conflict' && !force) return;
    if (pushing.current) {
      pendingPush.current = true;
      return;
    }

    const currentMeta = metaRef.current?.userId === currentSync.user.userId
      ? metaRef.current
      : {
          userId: currentSync.user.userId,
          cloudRev: null,
          lastCloudUpdatedAt: null,
          lastPulledAt: null,
          lastPushedAt: null,
          dirtySince: Date.now(),
        };

    const pushedJson = JSON.stringify(stateRef.current);
    pushing.current = true;
    patchSync({ status: 'saving', error: null });

    try {
      const result = await apiJson('/api/sync/state', {
        method: 'PUT',
        body: JSON.stringify({
          state: stateRef.current,
          baseRev: currentMeta.cloudRev,
          force,
        }),
      });

      const changedDuringPush = JSON.stringify(stateRef.current) !== pushedJson;
      const now = Date.now();
      persistSyncMeta({
        userId: result.userId,
        cloudRev: result.rev,
        lastCloudUpdatedAt: result.updatedAt,
        lastPulledAt: currentMeta.lastPulledAt || null,
        lastPushedAt: now,
        dirtySince: changedDuringPush ? now : null,
      });
      patchSync((current) => ({
        status: changedDuringPush ? 'saving' : 'synced',
        decision: null,
        conflict: null,
        error: null,
        profiles: profileWithState(current.profiles, result),
      }));
      if (changedDuringPush || pendingPush.current) {
        pendingPush.current = false;
        schedulePush();
      }
    } catch (err) {
      if (err.status === 409) {
        markConflict(err.data?.details || err.data || { currentRev: currentMeta.cloudRev });
      } else {
        patchSync({
          status: err instanceof TypeError ? 'offline' : 'error',
          error: err.message,
        });
      }
    } finally {
      pushing.current = false;
    }
  }, [markConflict, patchSync, persistSyncMeta, schedulePush]);

  useEffect(() => {
    pushLocalRef.current = pushLocal;
  }, [pushLocal]);

  useEffect(() => {
    syncRef.current = syncState;
  }, [syncState]);

  useEffect(() => {
    stateRef.current = state;
    if (!bootstrapped.current && JSON.stringify(state) !== initialStateJson.current) {
      preBootstrapDirty.current = true;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to persist state:', err);
      }
    }, LOCAL_SAVE_DEBOUNCE_MS);

    const currentSync = syncRef.current;
    if (bootstrapped.current && currentSync.user) {
      if (applyingCloudState.current) {
        applyingCloudState.current = false;
      } else if (
        !currentSync.decision &&
        currentSync.status !== 'conflict' &&
        currentSync.status !== 'local-only'
      ) {
        const existingMeta = metaRef.current;
        const now = Date.now();
        const nextMeta =
          existingMeta?.userId === currentSync.user.userId
            ? { ...existingMeta, dirtySince: existingMeta.dirtySince || now }
            : {
                userId: currentSync.user.userId,
                cloudRev: null,
                lastCloudUpdatedAt: null,
                lastPulledAt: null,
                lastPushedAt: null,
                dirtySince: now,
              };
        persistSyncMeta(nextMeta);
        schedulePush();
      }
    }

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [persistSyncMeta, schedulePush, state]);

  useEffect(() => {
    let cancelled = false;

    const startSync = async () => {
      patchSync({ status: 'checking', error: null });
      try {
        const { user } = await fetchMe();
        if (cancelled) return;

        const cloud = await fetchCloudState(user.userId);
        if (cancelled) return;

        const storedMeta =
          metaRef.current?.userId === user.userId ? metaRef.current : null;
        const effectiveMeta =
          storedMeta && preBootstrapDirty.current
            ? { ...storedMeta, dirtySince: storedMeta.dirtySince || Date.now() }
            : storedMeta;
        if (effectiveMeta !== storedMeta) persistSyncMeta(effectiveMeta);
        const meaningful = hasMeaningfulData(stateRef.current);

        bootstrapped.current = true;

        if (!cloud.state) {
          if (!effectiveMeta) {
            persistSyncMeta({
              userId: user.userId,
              cloudRev: null,
              lastCloudUpdatedAt: null,
              lastPulledAt: null,
              lastPushedAt: null,
              dirtySince: null,
            });
          }
          if (meaningful) {
            patchSync({
              status: 'needs-decision',
              decision: {
                type: 'upload-local',
                message: 'Upload this device to cloud?',
              },
            });
          } else {
            patchSync({ status: effectiveMeta?.dirtySince ? 'offline' : 'synced' });
            if (effectiveMeta?.dirtySince) schedulePush(0);
          }
          return;
        }

        if (!effectiveMeta) {
          patchSync({
            status: 'needs-decision',
            decision: {
              type: 'choose-source',
              message: 'Use cloud data or upload this device?',
              cloud,
            },
          });
          return;
        }

        if (effectiveMeta.dirtySince && Number(effectiveMeta.cloudRev) !== Number(cloud.rev)) {
          markConflict({
            userId: cloud.userId,
            currentRev: cloud.rev,
            updatedAt: cloud.updatedAt,
          });
          return;
        }

        if (Number(effectiveMeta.cloudRev) !== Number(cloud.rev)) {
          applyOwnCloudState(cloud);
          return;
        }

        patchSync({ status: effectiveMeta.dirtySince ? 'offline' : 'synced' });
        if (effectiveMeta.dirtySince) schedulePush(0);
      } catch (err) {
        bootstrapped.current = true;
        if (err.status === 401 || err.status === 403) {
          patchSync({ status: 'local-only', error: null });
        } else {
          patchSync({
            status: err instanceof TypeError ? 'offline' : 'error',
            error: err.message,
          });
        }
      }
    };

    startSync();
    return () => {
      cancelled = true;
    };
  }, [
    applyOwnCloudState,
    fetchCloudState,
    fetchMe,
    markConflict,
    patchSync,
    persistSyncMeta,
    schedulePush,
  ]);

  const loadCloud = useCallback(async () => {
    const user = syncRef.current.user;
    if (!user) return;
    patchSync({ status: 'checking', error: null });
    try {
      const cloud = await fetchCloudState(user.userId);
      if (cloud.state) {
        applyOwnCloudState(cloud);
      } else {
        persistSyncMeta({
          userId: user.userId,
          cloudRev: null,
          lastCloudUpdatedAt: null,
          lastPulledAt: Date.now(),
          lastPushedAt: null,
          dirtySince: null,
        });
        patchSync({ status: 'synced', decision: null, conflict: null });
      }
    } catch (err) {
      patchSync({
        status: err instanceof TypeError ? 'offline' : 'error',
        error: err.message,
      });
    }
  }, [applyOwnCloudState, fetchCloudState, patchSync, persistSyncMeta]);

  const uploadLocal = useCallback(async ({ force = false } = {}) => {
    const user = syncRef.current.user;
    if (!user) return;
    const existingMeta = metaRef.current?.userId === user.userId ? metaRef.current : null;
    persistSyncMeta({
      userId: user.userId,
      cloudRev: existingMeta?.cloudRev ?? null,
      lastCloudUpdatedAt: existingMeta?.lastCloudUpdatedAt ?? null,
      lastPulledAt: existingMeta?.lastPulledAt ?? null,
      lastPushedAt: existingMeta?.lastPushedAt ?? null,
      dirtySince: existingMeta?.dirtySince || Date.now(),
    });
    await pushLocal({ force });
  }, [persistSyncMeta, pushLocal]);

  const selectViewedUser = useCallback(async (userId) => {
    const user = syncRef.current.user;
    if (!user || !user.canView.includes(userId)) return;
    if (userId === user.userId) {
      patchSync({
        viewedUserId: userId,
        viewedState: null,
        viewedRev: null,
        viewedLoading: false,
      });
      return;
    }

    patchSync({
      viewedUserId: userId,
      viewedLoading: true,
      error: null,
    });
    try {
      const cloud = await fetchCloudState(userId);
      patchSync({
        viewedState: cloud.state ? normalizeState(cloud.state) : makeDefaultState(),
        viewedRev: cloud.rev,
        viewedLoading: false,
      });
    } catch (err) {
      patchSync({
        viewedLoading: false,
        error: err.message,
      });
    }
  }, [fetchCloudState, patchSync]);

  const setViewedState = useCallback((updater) => {
    setSyncState((current) => {
      const base = current.viewedState || makeDefaultState();
      const next = typeof updater === 'function' ? updater(base) : updater;
      return { ...current, viewedState: normalizeState(next) };
    });
  }, []);

  const pauseSync = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    patchSync({
      status: 'local-only',
      decision: null,
      conflict: null,
    });
  }, [patchSync]);

  useEffect(() => {
    const handleOnline = () => {
      if (metaRef.current?.dirtySince && syncRef.current.user) schedulePush(0);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [schedulePush]);

  useEffect(() => {
    if (!syncState.user || syncState.status === 'local-only') return undefined;

    const poll = async () => {
      try {
        const { profiles, user } = await fetchMe();
        const current = syncRef.current;
        const ownProfile = profiles.find((profile) => profile.userId === user.userId);
        const currentMeta = metaRef.current;

        if (
          ownProfile?.hasState &&
          currentMeta?.userId === user.userId &&
          Number(ownProfile.rev) !== Number(currentMeta.cloudRev)
        ) {
          if (currentMeta.dirtySince) {
            markConflict({
              userId: user.userId,
              currentRev: ownProfile.rev,
              updatedAt: ownProfile.updatedAt,
            });
          } else {
            const cloud = await fetchCloudState(user.userId);
            applyOwnCloudState(cloud);
          }
        }

        const viewedId = current.viewedUserId;
        if (viewedId && viewedId !== user.userId) {
          const viewedProfile = profiles.find((profile) => profile.userId === viewedId);
          if (viewedProfile?.hasState && Number(viewedProfile.rev) !== Number(current.viewedRev)) {
            const cloud = await fetchCloudState(viewedId);
            patchSync({
              viewedState: cloud.state ? normalizeState(cloud.state) : makeDefaultState(),
              viewedRev: cloud.rev,
            });
          }
        }
      } catch {
        if (metaRef.current?.dirtySince) patchSync({ status: 'offline' });
      }
    };

    const intervalId = window.setInterval(poll, PROFILE_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [
    applyOwnCloudState,
    fetchCloudState,
    fetchMe,
    markConflict,
    patchSync,
    syncState.status,
    syncState.user,
  ]);

  const viewedProfile =
    syncState.profiles.find((profile) => profile.userId === syncState.viewedUserId) || null;
  const viewOnly =
    Boolean(syncState.user && syncState.viewedUserId && syncState.viewedUserId !== syncState.user.userId);

  return [
    state,
    setState,
    {
      ...syncState,
      viewedProfile,
      viewedLabel: profileLabel(viewedProfile),
      viewOnly,
      uploadLocal,
      loadCloud,
      overwriteCloud: () => uploadLocal({ force: true }),
      selectViewedUser,
      setViewedState,
      pauseSync,
    },
  ];
};

export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_META_KEY);
    window.location.reload();
  } catch (err) {
    console.error('Failed to clear data:', err);
  }
};
