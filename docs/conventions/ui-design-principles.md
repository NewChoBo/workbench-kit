# UI design principles

Source of truth for Workbench Kit chrome and public UI surfaces. Agents and
humans follow these when adding or changing React shell, primitives, samples,
and Storybook frames.

Related:

- Tokens / CSS variables: [`@workbench-kit/tokens`](../../packages/tokens/)
- CSS & icons: [plan-a-css-and-naming.md](./plan-a-css-and-naming.md)
- Consumer surfaces: [consumer-capabilities.md](../workbench/consumer-capabilities.md)
- Story placement: [storybook.md](./storybook.md)

---

## 1. Prefer shared kit components

Use published primitives and shell pieces before inventing markup.

| Prefer                                                         | Avoid                                     |
| -------------------------------------------------------------- | ----------------------------------------- |
| `IconButton`, `Button`, `Toolbar`, `Codicon` / `WorkbenchIcon` | Ad-hoc `<button>` + inline SVG for chrome |
| `SideBarViewFrame`, filter/list layouts already documented     | One-off panel chrome that forks density   |
| Existing field / form / dialog patterns                        | Parallel “almost the same” local widgets  |

If a needed primitive is missing, **add or extend the kit surface** (issue +
export) instead of forking in the sample host or a consumer-only copy.

---

## 2. Icon buttons for chrome; text buttons for decisions

Workbench chrome should read like a dense IDE (VS Code–like), not a marketing
page of labeled pills.

| Surface                                                   | Default control                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| Toolbars, title actions, list row actions, palette chrome | `IconButton` with accessible `label` / `aria-label`               |
| Dialogs, forms, empty-state CTAs, destructive confirms    | Text `Button` (label required)                                    |
| Split actions                                             | Icon primary + text only when the verb is ambiguous without words |

**Do not** ship a text button next to peers that are already icon-only for the
same density band (e.g. minimap / fit / filter toggles).

Every `IconButton` must expose an accessible name (visible tooltip or `label`).

---

## 3. Theme owns color

All visible colors go through **theme tokens** (CSS variables from
`@workbench-kit/tokens` and semantic aliases). Hard-coded hex/rgb in component
CSS or inline styles is a bug unless it is a documented non-theme exception
(e.g. syntax highlighting that already maps through editor token colors).

| Do                                                | Don’t                                       |
| ------------------------------------------------- | ------------------------------------------- |
| `var(--ui-…)` / documented semantic tokens        | `#fff`, `rgba(0,0,0,.2)` in feature CSS     |
| Light/dark via theme switch / host token alias    | Separate “light-only” hex forks per feature |
| Host aliases kit variables after importing tokens | Feature-local color systems                 |

Field Remap, Extensions, settings, and sample hosts must stay on the same token
pipeline. Gaps (missing semantic tokens for a surface) are fixed in tokens /
theme, not with one-off paints — see open theme work such as Field Remap light/dark
token coverage.

---

## 4. Avoid unnecessary wrapping structure

Prefer a **flat composition**: one frame, one scroll owner, one chrome band.

| Prefer                                               | Avoid                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| Content filling the owning view frame                | Extra card / bordered box around content already in a panel         |
| Direct children of `SideBarViewFrame` / editor shell | Nested “panel in panel” wrappers for visual nesting only            |
| CSS gap/padding on the real layout owner             | Wrapper `<div>`s whose only job is another background/radius/shadow |

**Cards are interaction containers**, not default decoration. If removing a
wrapper’s border, background, or radius does not hurt understanding or hit
targets, delete the wrapper.

This does **not** ban layout primitives (`SplitView`, flex rows, portals). It
bans decorative or redundant nesting.

---

## 5. Density and hierarchy

- Match surrounding workbench density (sidebar vs editor vs settings frames —
  see Storybook frames).
- One primary action per band; secondary actions stay icon-compact.
- Do not add badge/chip/stat clusters to chrome unless the product job requires
  them.
- Motion is for hierarchy and state, not ornament.

---

## 6. Copy and i18n

- User-visible strings in **English** in kit sources (see [language-policy.md](./language-policy.md)).
- Structure labels for later injection (`t()` / prop labels) where shell chrome
  already has an i18n path.
- Accessible names count as UI copy — keep them short and specific.

---

## 7. Exceptions

Document exceptions in the PR or issue when:

- A host **must** show a text label for legal/safety (e.g. Install, Uninstall).
- A primitive truly does not exist yet (link the tracking issue; temporary local
  markup must be deleted when the kit export lands).
- Third-party surfaces (e.g. Monaco) bring their own theming bridge — still map
  into workbench theme tokens where the kit owns the bridge.

---

## Checklist (authors / agents)

Before merging UI changes:

- [ ] Reused an existing kit component where one fits
- [ ] Chrome actions are `IconButton` (with a11y label) unless a text CTA is required
- [ ] No new hard-coded colors; tokens only
- [ ] No decorative wrapper card / double frame
- [ ] Story or sample uses the frame that matches production placement
