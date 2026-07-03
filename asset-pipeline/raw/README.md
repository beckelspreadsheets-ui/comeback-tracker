# Raw Asset Intake

This directory is an optional future intake root for immutable source assets.

Phase 1 does not copy existing source files here. The current authoritative source root remains:

```text
3d generations:character sheets/
```

Files placed here should be treated as immutable source inputs. Pipeline automation may read and hash them, but must not overwrite, move, delete, optimize, or promote them directly.
