# Runtime Asset Manifest Compatibility

The current runtime manifest at `src/assets/game/asset-manifest.json` is an array of records. Phase 1 preserves that shape so existing code keeps working.

Existing fields:

- `filePath`
- `source`
- `license`
- `role`
- `sizeBudget`
- `fallback`

The Phase 1 audit treats these fields as the current provenance baseline. Strict runtime validation also reports future pipeline fields as missing when they are absent, without fabricating values:

- `sourceHash`
- `outputHash`
- `assetId`
- `assetClass`
- `status`
- `proof`
- `runtimeTransform`

Future phases may migrate to a versioned object manifest or add compatible per-record fields. That migration should be done only when runtime import code and validation agree on the new shape.
