# Theme Pack Architecture

Product-neutral design for built-in presets, VS Code–inspired catalog growth, and
installable theme distribution in workbench-kit.

**Related:** [future-capabilities.md § Custom themes](./future-capabilities.md#custom-themes-p2)
(T0–T4), `@workbench-kit/tokens`, `@workbench-kit/react/workbench/themePresets`,
`extensions/samples.theme-alt/`, `packages/workbench-core/src/theme/registry.ts`.

## Current contract

Hosts apply **Appearance** on a DOM root (usually `document.documentElement` or the shell
wrapper). Terminology follows VS Code Settings › Appearance where a mapping exists; see
[VS Code alignment](#vs-code-alignment) below.

| Attribute               | Values                        | Role                                                     |
| ----------------------- | ----------------------------- | -------------------------------------------------------- |
| `data-theme`            | `light` \| `dark`             | Resolved color scheme                                    |
| `data-theme-preference` | `system` \| `light` \| `dark` | User preference (optional on root)                       |
| `data-theme-preset`     | color preset id               | Active **Color Theme** for resolved scheme               |
| `data-shell-preset`     | layout preset id              | **Workbench Layout** metrics (orthogonal to Color Theme) |

Base tokens live in `@workbench-kit/tokens/styles.css` (imports `alias-layers.css` for
primitive → semantic → flat → shell color aliases). Color preset overrides load via
`theme-presets.css`; layout preset overrides load via `shell-presets.css`.

TypeScript registries:

- Color: `LIGHT_THEME_PRESET_MANIFEST` / `DARK_THEME_PRESET_MANIFEST` in `themePresets.ts`
- Layout: `SHELL_PRESET_MANIFEST` in `shellPresets.ts`

UI copy (labels/descriptions): `appearanceLabels.ts` — shared by shell settings and hosts.

## VS Code alignment

Workbench-kit splits what VS Code users mostly see as **Color Theme** from **layout
settings** that VS Code exposes as individual workbench/editor preferences (no first-class
layout preset).

| VS Code (Settings / API)                     | Workbench-kit                                                       | UI label                                   |
| -------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `window.autoDetectColorScheme` + forced mode | `themePreference` (`system` / `light` / `dark`)                     | Color scheme                               |
| `workbench.preferredLightColorTheme`         | `lightPreset` → `data-theme-preset` when resolved light             | Preferred Light Color Theme                |
| `workbench.preferredDarkColorTheme`          | `darkPreset` → `data-theme-preset` when resolved dark               | Preferred Dark Color Theme                 |
| `contributes.themes` (Color Theme JSON)      | CSS color presets + `ThemeContribution.tokenOverrides`              | (listed in preferred light/dark dropdowns) |
| `workbench.colorTheme` (active)              | Derived from preference + preferred presets                         | —                                          |
| File Icon Theme                              | `@workbench-kit/tokens` file icon tokens (not preset-swapped today) | _(future)_                                 |
| Product Icon Theme                           | codicons (fixed)                                                    | _(future)_                                 |
| Editor font, zoom, scattered UI sizes        | `shellPreset` → `data-shell-preset`                                 | Workbench Layout                           |

**Combine freely:** Preferred Dark Color Theme `purple` + Workbench Layout `airy` is valid,
same as VS Code Dark+ with a larger custom zoom — except layout is a named preset, not zoom.

**Do not call** `shellPreset` a “theme” in user-facing copy; reserve **Color Theme** for
`themePreset` / `ThemeContribution` (VS Code `colors.*` surface).

**Code identifiers** (`themePreset`, `shellPreset`, `lightPreset`) remain stable; only UI and
docs use VS Code-aligned labels.

## File layout (implemented)

```text
packages/tokens/src/
  styles.css                 # base :root + [data-theme] tokens, imports presets
  alias-layers.css           # primitive → semantic → flat → shell color aliases
  theme-presets.css          # index: @import all color preset files
  shell-presets.css          # index: @import all layout preset files
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
      slate.css            # brand pack via --primitive-* only
  shell/
    baseline-metrics.css   # :root + data-shell-preset='default'
    workbench.css          # compact layout
    airy.css               # comfortable layout

packages/react/src/workbench/
  themePresets.ts            # color preset manifest + apply helpers
  shellPresets.ts              # layout preset manifest + apply helpers
  appearanceLabels.ts          # VS Code-aligned Settings copy
```

**Rules**

- Add a **color** preset: create `themes/{light|dark}/{id}.css`, add `@import` in
  `theme-presets.css`, add one row to the matching manifest in `themePresets.ts`.
- Add a **layout** preset: create `shell/{id}.css`, add `@import` in `shell-presets.css`,
  add one row to `SHELL_PRESET_MANIFEST` in `shellPresets.ts`.
- Do not add preset blocks back into a monolithic CSS file.
- Color selectors: `[data-theme='light|dark'][data-theme-preset='{id}']`.
- Layout selectors: `[data-shell-preset='{id}']`.

## Workbench Layout presets (shell)

Non-color metrics (`--workbench-header-height`, `--shell-radius-*`, spacing, control heights)
swapped via `data-shell-preset`. Integrating hosts may ship **additional** layout packs
outside `@workbench-kit/tokens`; import host CSS after kit tokens.

| Id          | Label       | Notes                           |
| ----------- | ----------- | ------------------------------- |
| `default`   | Default     | Kit baseline                    |
| `workbench` | Compact     | VS Code–adjacent compact chrome |
| `airy`      | Comfortable | Larger radius and header        |

## Shell chrome tokens (reference)

Non-color shell metrics live in `packages/tokens/src/shell/baseline-metrics.css` on
`:root` and `[data-shell-preset='default']`. Layout presets override subsets in
`shell/workbench.css`, `shell/airy.css`, or host packs.

Each preset overrides the workbench chrome palette subset:

| Token                         | Typical VS Code color key          |
| ----------------------------- | ---------------------------------- |
| `--color-bg`                  | `editor.background`                |
| `--color-primary-side-bar-bg` | `sideBar.background`               |
| `--color-surface`             | `panel.background` / list surfaces |
| `--color-surface-hover`       | `list.hoverBackground`             |
| `--color-surface-elevated`    | inputs, elevated panels            |
| `--color-border`              | `sideBar.border` / `panel.border`  |
| `--color-text`                | `editor.foreground` / `foreground` |
| `--color-text-muted`          | `descriptionForeground`            |
| `--color-text-subtle`         | disabled / tertiary text           |
| `--color-accent`              | `button.background`                |
| `--color-accent-hover`        | `button.hoverBackground`           |
| `--color-focus-border`        | `focusBorder`                      |
| `--color-danger`              | `errorForeground` / notifications  |
| `--scrollbar-thumb*`          | derived from border/surface        |

File icons and control metric defaults stay in `styles.css`; **color** presets only swap
semantic colors (or primitives for alias-first packs like `slate`).

## Alias layers (primitive → semantic → component)

| Layer             | Examples                                                         | Who overrides                     |
| ----------------- | ---------------------------------------------------------------- | --------------------------------- |
| Primitive         | `--primitive-neutral-950`, `--primitive-accent-500`              | Brand packs (preferred)           |
| Semantic          | `--color-bg-canvas`, `--color-bg-sidebar`, `--color-fg-default`  | Rare; keep meaning stable         |
| Flat legacy       | `--color-bg`, `--color-primary-side-bar-bg`, …                   | Existing presets / hosts (compat) |
| Component / shell | `--shell-editor-bg`, `--shell-activity-bg`, `--shell-sidebar-bg` | Region roles → semantic           |

Flat legacy vars remain the primary consumption surface for existing chrome CSS. New CSS may
use semantic or `--shell-*` aliases. Density packs continue to swap `--shell-spacing-*` /
radius metrics without rewriting color primitives.

## CSS variable surface (Color Theme)

| Token                                 | Role                                                          |
| ------------------------------------- | ------------------------------------------------------------- |
| `--font-size-xs` … `--font-size-lg`   | Typography scale                                              |
| `--font-family`, `--font-family-mono` | Shell font stacks                                             |
| `--shell-font-size-panel-title`       | Panel / sidebar section headers                               |
| `--shell-font-size-body`              | Default shell body copy                                       |
| `--shell-font-size-caption`           | Secondary labels, chips                                       |
| `--shell-font-size-icon`              | Inline sidebar / list icons                                   |
| `--radius-sm`, `--radius-md`          | Base corner radius scale                                      |
| `--shell-radius-panel`                | Panel surfaces                                                |
| `--shell-radius-control`              | Buttons, chips                                                |
| `--shell-radius-input`                | Inputs, selects                                               |
| `--shell-border-width`                | Standard 1px chrome borders                                   |
| `--shell-spacing-inline`              | Default horizontal padding                                    |
| `--shell-spacing-block`               | Default vertical gap                                          |
| `--shell-spacing-side-bar-inline`     | Primary sidebar horizontal padding                            |
| `--shell-spacing-side-bar-block`      | Primary sidebar row block padding                             |
| `--workbench-panel-padding-*`         | Settings content, panel-region scroll, structured form bodies |
| `--workbench-settings-*`              | Settings modal chrome; aliases panel padding where shared     |
| `--panel-header-height`               | Panel header row height (aliases `--workbench-header-height`) |
| `--workbench-*`, `--control-*`        | Component-specific shell dimensions                           |

`@workbench-kit/react` maps region tokens (for example `--ui-sidebar-inline-padding`) to these
shell aliases where possible.

## Built-in preset catalog

### Shipped today

| Id           | Label               | Scheme | Notes                           |
| ------------ | ------------------- | ------ | ------------------------------- |
| `skyblue`    | Sky Blue            | light  | Default light preset            |
| `orange`     | Light Orange        | light  | Warm variant                    |
| `light-plus` | Light+              | light  | VS Code Default Light+          |
| `navy`       | Deep Navy           | dark   | Cool blue-gray                  |
| `purple`     | Purple              | dark   | Default dark preset             |
| `modern`     | Modern Dark         | dark   | Neutral gray (VS Code–adjacent) |
| `dark-plus`  | Dark+               | dark   | VS Code Default Dark+           |
| `hc-black`   | High Contrast Black | dark   | VS Code HC Black                |
| `slate`      | Slate (alias pack)  | dark   | Overrides `--primitive-*` only  |

### VS Code–inspired backlog (not yet implemented)

Candidates for a follow-up pack; map the same CSS variables from theme JSON `colors`:

| Proposed id       | VS Code reference   | Scheme | Mapping notes                             |
| ----------------- | ------------------- | ------ | ----------------------------------------- |
| `quiet-light`     | Quiet Light         | light  | Soft gray sidebar `#F3F3F3`, muted accent |
| `solarized-light` | Solarized Light     | light  | `#fdf6e3` bg, `#268bd2` accent            |
| `github-light`    | GitHub Light        | light  | GitHub palette; border `#d0d7de`          |
| `monokai`         | Monokai             | dark   | `#272822` bg, `#a6e22e` accent (brand)    |
| `one-dark-pro`    | One Dark Pro        | dark   | `#282c34` bg, `#61afef` accent            |
| `dracula`         | Dracula             | dark   | `#282a36` bg, `#bd93f9` accent            |
| `hc-light`        | High Contrast Light | light  | White bg, thick `#000000` borders         |
| `abyss`           | Abyss               | dark   | Deep blue `#000c18`, cyan accent          |

Monaco syntax themes (T3) sync with chrome via `useMonacoWorkbenchThemeSync`: default
rules derive from CSS tokens; hosts may inject VS Code–style `tokenColors` for richer
scopes. Grammar packs remain host-owned.

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
unless the host wires it, Monaco sync still needs host `tokenColors` for grammar packs (T3 defaults cover built-in tokenizers).

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

### Channel C — JSON import (VS Code theme schema subset) — **T2 (mapper shipped)**

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

`@workbench-kit/tokens` exports `cssVariablesFromEditorColors` / `EDITOR_COLOR_TO_KIT_TOKEN`
to map the documented `colors.*` subset → `--color-*` (see the chrome token table above).
Hosts apply the returned record (for example via `hostThemes` token overrides). `tokenColors`
feed Monaco via `@workbench-kit/monaco` (`monacoRulesFromTokenColors` →
`setWorkbenchMonacoTokenRules` / `defineOrUpdateWorkbenchMonacoTheme`), not shell chrome.
**Pros:** reuse existing VS Code theme files.
**Cons:** subset validation, incomplete mappings, IP/licensing of community themes.

**Best for:** user-imported themes, migration from VS Code favorites.

### Comparison

| Approach             | Runtime install | Full chrome         | VS Code JSON         | Extension manifest     |
| -------------------- | --------------- | ------------------- | -------------------- | ---------------------- |
| Built-in CSS presets | Bundled         | Yes                 | Manual port          | N/A                    |
| `ThemeContribution`  | Yes             | Partial (overrides) | Convert to overrides | Yes                    |
| npm theme package    | Build/deploy    | Yes                 | Optional build step  | Optional wrapper ext   |
| JSON import (T2)     | Yes             | Yes (mapped)        | Native               | Via contributes.themes |

## Phased roadmap

| Phase    | Deliverable                                        | Status                                                  |
| -------- | -------------------------------------------------- | ------------------------------------------------------- |
| **T0**   | Document `data-theme` + token mapping              | This doc + split CSS                                    |
| **T0.5** | Per-preset files + manifest registry               | Done (color + layout)                                   |
| **T1**   | `registerWorkbenchTheme` wired in integrated shell | Done (`WorkbenchProvider.hostThemes`, workbench-sample) |
| **T2**   | VS Code `colors` JSON → CSS variables              | Done (`cssVariablesFromEditorColors`)                   |
| **T3**   | Monaco theme sync from active preset               | Done (chrome + default/host tokenColors rules)          |
| **T4**   | Settings UI + persistence via registry             | Appearance story + shell-settings                       |

Installable **extension themes** are feasible now for override-style packs (Channel A).
Installable **full presets** are feasible via npm CSS packs (Channel B) today and JSON import
(Channel C) after T2.

## Host bootstrap API (T1)

Hosts register override themes without an extension manifest:

```ts
import {
  createWorkbenchHostThemeRegistration,
  registerWorkbenchTheme,
} from '@workbench-kit/workbench-core';
import { WorkbenchProvider } from '@workbench-kit/shell-react';

const hostThemes = [
  createWorkbenchHostThemeRegistration('my-app.theme.forest', tokenOverrides, {
    label: 'Forest',
    mode: 'dark',
  }),
];

// Option A — declarative bootstrap on WorkbenchProvider
<WorkbenchProvider hostThemes={hostThemes}>...</WorkbenchProvider>;

// Option B — imperative registration on an existing ThemeRegistry
registerWorkbenchTheme(registry.themes, 'my-app.theme.forest', tokenOverrides, {
  label: 'Forest',
  mode: 'dark',
});
```

`tokenOverrides` must include every key in `REQUIRED_THEME_TOKEN_KEYS`. Host themes use
extension id `workbench-kit.host` and appear in Appearance settings alongside built-in presets
and extension contributions. Reference: `examples/workbench-sample/src/host-themes.ts`.

## Migration from monolithic `theme-presets.css`

1. Extract each `[data-theme=…][data-theme-preset=…]` block into `themes/{light|dark}/{id}.css`.
2. Replace monolith body with `@import` index (keep `theme-presets.css` as public export path).
3. Extend `themePresets.ts` manifests; types derive from manifest ids.
4. No host breaking change: preset ids unchanged; new ids are additive.
5. Re-run Storybook Appearance play baseline; sample storage uses `isLightThemePresetId` /
   `isDarkThemePresetId` for forward-compatible validation.

## Agent coordination

- **Appearance / Storybook:** import options from `themePresets.ts` / `shellPresets.ts` only.
- **Settings UI:** import labels from `appearanceLabels.ts` — do not duplicate VS Code copy.
- **Sample apps:** `workbench-sample` appearance storage validates via type guards.
- **Shell settings:** uses manifest options + `WORKBENCH_APPEARANCE_FIELD_*` labels.
- **Extension samples:** keep `samples.theme-alt` as the override-style reference; do not merge
  into built-in CSS unless promoted to tokens package.
