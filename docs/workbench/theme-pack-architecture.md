# Theme Pack Architecture

Product-neutral design for built-in presets, VS Code–inspired catalog growth, and
installable theme distribution in workbench-kit.

**Related:** [future-capabilities.md § Custom themes](./future-capabilities.md#custom-themes-p2)
(T0–T4), `@workbench-kit/tokens`, `@workbench-kit/react/workbench/themePresets`,
`extensions/samples.theme-alt/`, `packages/workbench-core/src/theme-registry.ts`.

## Current contract

Hosts apply appearance on a DOM root (usually `document.documentElement` or the shell
wrapper):

| Attribute | Values | Role |
| --------- | ------ | ---- |
| `data-theme` | `light` \| `dark` | Resolved color scheme |
| `data-theme-preference` | `system` \| `light` \| `dark` | User preference (optional on root) |
| `data-theme-preset` | preset id | Active palette for resolved scheme |

Base tokens live in `@workbench-kit/tokens/styles.css`. Preset overrides are loaded via
`theme-presets.css`, which `@import`s one file per preset.

TypeScript registry: `LIGHT_THEME_PRESET_MANIFEST` / `DARK_THEME_PRESET_MANIFEST` in
`packages/react/src/workbench/themePresets.ts` — **one manifest entry per CSS file**.

## File layout (implemented)

```text
packages/tokens/src/
  styles.css                 # base :root + [data-theme] tokens, imports presets
  theme-presets.css          # index: @import all preset files
  themes/
    light/
      skyblue.css
      orange.css
      light-plus.css       # VS Code Default Light+
    dark/
      navy.css
      purple.css
      modern.css
      dark-plus.css        # VS Code Default Dark+
      hc-black.css         # VS Code High Contrast Black

packages/react/src/workbench/
  themePresets.ts            # manifest arrays + types + apply helpers
```

**Rules**

- Add a preset: create `themes/{light|dark}/{id}.css`, add `@import` in
  `theme-presets.css`, add one row to the matching manifest in `themePresets.ts`.
- Do not add preset blocks back into a monolithic CSS file.
- Preset selectors must match: `[data-theme='light|dark'][data-theme-preset='{id}']`.

## CSS variable surface

Each preset overrides the workbench chrome palette subset:

| Token | Typical VS Code color key |
| ----- | ------------------------- |
| `--color-bg` | `editor.background` |
| `--color-primary-side-bar-bg` | `sideBar.background` |
| `--color-surface` | `panel.background` / list surfaces |
| `--color-surface-hover` | `list.hoverBackground` |
| `--color-surface-elevated` | inputs, elevated panels |
| `--color-border` | `sideBar.border` / `panel.border` |
| `--color-text` | `editor.foreground` / `foreground` |
| `--color-text-muted` | `descriptionForeground` |
| `--color-text-subtle` | disabled / tertiary text |
| `--color-accent` | `button.background` |
| `--color-accent-hover` | `button.hoverBackground` |
| `--color-focus-border` | `focusBorder` |
| `--color-danger` | `errorForeground` / notifications |
| `--scrollbar-thumb*` | derived from border/surface |

File icons and control metrics stay in `styles.css`; presets only swap semantic colors.

## Built-in preset catalog

### Shipped today

| Id | Label | Scheme | Notes |
| -- | ----- | ------ | ----- |
| `skyblue` | Sky Blue | light | Default light preset |
| `orange` | Light Orange | light | Warm variant |
| `light-plus` | Light+ | light | VS Code Default Light+ |
| `navy` | Deep Navy | dark | Cool blue-gray |
| `purple` | Purple | dark | Default dark preset |
| `modern` | Modern Dark | dark | Neutral gray (VS Code–adjacent) |
| `dark-plus` | Dark+ | dark | VS Code Default Dark+ |
| `hc-black` | High Contrast Black | dark | VS Code HC Black |

### VS Code–inspired backlog (not yet implemented)

Candidates for a follow-up pack; map the same CSS variables from theme JSON `colors`:

| Proposed id | VS Code reference | Scheme | Mapping notes |
| ----------- | ----------------- | ------ | ------------- |
| `quiet-light` | Quiet Light | light | Soft gray sidebar `#F3F3F3`, muted accent |
| `solarized-light` | Solarized Light | light | `#fdf6e3` bg, `#268bd2` accent |
| `github-light` | GitHub Light | light | GitHub palette; border `#d0d7de` |
| `monokai` | Monokai | dark | `#272822` bg, `#a6e22e` accent (brand) |
| `one-dark-pro` | One Dark Pro | dark | `#282c34` bg, `#61afef` accent |
| `dracula` | Dracula | dark | `#282a36` bg, `#bd93f9` accent |
| `hc-light` | High Contrast Light | light | White bg, thick `#000000` borders |
| `abyss` | Abyss | dark | Deep blue `#000c18`, cyan accent |

Monaco syntax themes (T3) are separate from chrome presets; only shared token names overlap.

## Installable themes — feasibility

**Verdict: yes**, with two complementary channels already sketched in the codebase.

### Channel A — Extension manifest (`ThemeContribution`) — **today (partial)**

`extensions/samples.theme-alt/` demonstrates:

```json
"contributes": {
  "themes": [{
    "id": "workbench-kit.samples.theme-alt.dark-blue",
    "label": "Dark Blue Alt",
    "tokenOverrides": { "--color-bg": "#0a1628", ... }
  }]
}
```

`ThemeRegistry` + `applyThemeTokenOverrides()` apply `tokenOverrides` as inline CSS variables on
the host element. **Pros:** dynamic registration, no CSS bundle rebuild, matches extension
packaging. **Cons:** overrides only (no full selector graph), no `data-theme-preset` switching
unless the host wires it, Monaco sync still manual (T3).

**Best for:** small delta themes, extension marketplace packs, A/B experiments.

### Channel B — npm CSS theme pack — **today (built-ins)**

`@workbench-kit/tokens` publishes `styles.css` + per-preset files. Hosts import once:

```ts
import '@workbench-kit/tokens/styles.css';
```

**Pros:** full preset files, tree-shakeable if host imports subsets later, works without
extension runtime. **Cons:** requires publish/version bump per pack; not hot-swappable at
runtime without dynamic `import()` or link injection.

**Best for:** first-party and third-party preset packs (`@acme/workbench-theme-dracula`).

### Channel C — JSON import (VS Code theme schema subset) — **T2 (planned)**

VS Code theme JSON shape (simplified):

```json
{
  "name": "My Theme",
  "type": "dark",
  "colors": {
    "editor.background": "#1e1e1e",
    "sideBar.background": "#252526",
    "button.background": "#0e639c"
  },
  "tokenColors": [ ... ]
}
```

Workbench-kit would map `colors.*` → `--color-*` via a fixed lookup table; `tokenColors` feed
Monaco (T3), not shell chrome. **Pros:** reuse existing VS Code theme files. **Cons:** subset
validation, incomplete mappings, IP/licensing of community themes.

**Best for:** user-imported themes, migration from VS Code favorites.

### Comparison

| Approach | Runtime install | Full chrome | VS Code JSON | Extension manifest |
| -------- | --------------- | ----------- | ------------ | ------------------ |
| Built-in CSS presets | Bundled | Yes | Manual port | N/A |
| `ThemeContribution` | Yes | Partial (overrides) | Convert to overrides | Yes |
| npm theme package | Build/deploy | Yes | Optional build step | Optional wrapper ext |
| JSON import (T2) | Yes | Yes (mapped) | Native | Via contributes.themes |

## Phased roadmap

| Phase | Deliverable | Status |
| ----- | ----------- | ------ |
| **T0** | Document `data-theme` + token mapping | This doc + split CSS |
| **T0.5** | Per-preset files + manifest registry | Done |
| **T1** | `registerWorkbenchTheme` wired in integrated shell | Backlog |
| **T2** | VS Code `colors` JSON → CSS variables | Backlog |
| **T3** | Monaco theme sync from active preset | Partial (`useMonacoWorkbenchThemeSync`) |
| **T4** | Settings UI + persistence via registry | Appearance story + shell-settings |

Installable **extension themes** are feasible now for override-style packs (Channel A).
Installable **full presets** are feasible via npm CSS packs (Channel B) today and JSON import
(Channel C) after T2.

## Migration from monolithic `theme-presets.css`

1. Extract each `[data-theme=…][data-theme-preset=…]` block into `themes/{light|dark}/{id}.css`.
2. Replace monolith body with `@import` index (keep `theme-presets.css` as public export path).
3. Extend `themePresets.ts` manifests; types derive from manifest ids.
4. No host breaking change: preset ids unchanged; new ids are additive.
5. Re-run Storybook Appearance play baseline; sample storage uses `isLightThemePresetId` /
   `isDarkThemePresetId` for forward-compatible validation.

## Agent coordination

- **Appearance / Storybook:** import options from `themePresets.ts` only — do not duplicate
  preset id lists in stories or samples.
- **Sample apps:** `workbench-sample` appearance storage already validates via type guards.
- **Shell settings:** uses `LIGHT_THEME_PRESET_OPTIONS` / `DARK_THEME_PRESET_OPTIONS` — no
  local id arrays.
- **Extension samples:** keep `samples.theme-alt` as the override-style reference; do not merge
  into built-in CSS unless promoted to tokens package.
