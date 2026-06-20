# Preference scopes and merge order

Workbench Kit v1 preference layers follow a fixed merge order inspired by VS Code / Theia configuration scopes.

## Supported scopes

| Scope       | Source in v1                                     | Precedence |
| ----------- | ------------------------------------------------ | ---------- |
| `default`   | Extension `configuration.properties[].default`   | Lowest     |
| `workspace` | `.workbench/settings.json` (flat keys)           | Middle     |
| `local`     | Browser `localStorage` (`settings.local` bucket) | Highest    |

Merge rule: **workspace overrides default; local overrides workspace** for the same key.

Implementation:

- `@workbench-kit/workbench-config` — `PreferenceScope`, `mergeScopedPreferences`, `mergePreferenceValuesByScope`
- `@workbench-kit/workbench-core` — `PreferenceService` with `getEffectiveValue`, `setScopedValue`, `onDidChangePreference`
- `@workbench-kit/workbench-react` — provider wiring, local persistence, settings UI checkbox for boolean contributions

## Future scopes (not implemented)

Documented for later hardening only — not merged or persisted in v1:

- `user`
- `resource`
- `secret` (must never store credentials in repo config files)

## Extension contributions

Extension manifests continue to declare `configuration.properties` with optional `scope` metadata (`application`, `workspace`, `window`). Runtime merge uses the three runtime scopes above; manifest scope labels remain descriptive for now.

## Validation

```powershell
pnpm --filter @workbench-kit/workbench-config test
pnpm --filter @workbench-kit/workbench-core test
pnpm validate:static
```
