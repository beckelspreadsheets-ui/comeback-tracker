CREATE TABLE user_states (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  state_json TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE state_backups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX idx_state_backups_user_created
ON state_backups(user_id, created_at DESC);
