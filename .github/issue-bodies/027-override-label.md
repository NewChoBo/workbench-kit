## Summary

Add optional **property / field label chrome** for sparse-override inspectors: a Custom vs Default status badge and a Reset action slot. Hosts supply all copy and reset handlers; kit owns layout, tokens, and interaction affordances only.

**Template:** Consumer extract  
**Effort:** S  
**Guide:** [docs/conventions/github-issues.md](../blob/staging/docs/conventions/github-issues.md)

---

## Capability statement (product-neutral)

Workbench inspectors often edit a **sparse override** on top of content/defaults. Authors need to see whether a row is still at default or customized, and one-click restore the default without leaving the form. This is a generic IDE/settings pattern, not a domain schema.

---

## Problem / consumer pain

- Desktop hosts reimplement badge + reset chrome next to `Field` / `WorkbenchProperty*` rows.
- Copy and reset semantics differ per product, but the **chrome** (inline badge, compact reset control, label row layout) keeps drifting.
- `Field.label` already accepts `ReactNode`, so hosts currently jam ad-hoc markup into labels with product CSS classes.

---

## Goals

- Ship a small presentational helper (or documented `Field.label` composition) for override status + reset.
- Work with existing `Field` and property-panel rows without requiring new domain types.
- English UI strings passed as props (i18n-ready); no baked product catalogs.
- Storybook coverage on a **settings / form surface**.

## Non-goals

- Content-type option schemas, sparse-merge/clear algorithms for specific widgets
- Host locale tables or copy hooks
- Changing property-search / section filtering APIs
- Electron or persistence of any kind

---

## Kit gap today

| Existing                                        | Notes                                          |
| ----------------------------------------------- | ---------------------------------------------- |
| `packages/react/src/primitives/field/Field.tsx` | `label?: ReactNode` — composition point exists |
| `WorkbenchProperty*` / property panel layout    | Rows/sections exist; no override badge chrome  |
| `Button` compact                                | Suitable for Reset control                     |

Missing: shared label chrome component + CSS under kit tokens (not host `widgets-hub__*` classes).

---

## Reference behavior (algorithmic)

Proven host pattern (describe only — do not port product CSS class names):

1. Label row is a horizontal flex: **[label text + badge] … [optional Reset]**.
2. When `overridden === true`, show a “custom” badge; otherwise show a “default” badge (muted).
3. Reset control renders **only** when `overridden === true` **and** `onReset` is provided.
4. Reset is a compact button; click calls `onReset()` only (kit does not mutate values).
5. All visible strings (`customLabel`, `defaultLabel`, `resetLabel`) are props with English defaults allowed for Storybook only.

---

## Promote into kit

- `WorkbenchPropertyOverrideLabel` (name TBD) under `@workbench-kit/react` property/field chrome
- Minimal CSS using shell/form tokens (badge muted vs accent; no glow/pill spam)
- Optional convenience: document composing it into `Field label={...}`

## Host keeps forever

- Which fields are overridden (domain comparison)
- What “reset” writes (clear sparse key, restore default object, etc.)
- Product copy / locale packs
- Option schemas and validators

---

## Proposed public API

```ts
export interface WorkbenchPropertyOverrideLabelProps {
  readonly label: ReactNode;
  readonly overridden: boolean;
  readonly onReset?: () => void;
  /** Defaults for Storybook only; hosts should pass i18n strings. */
  readonly customBadgeLabel?: string; // default "Custom"
  readonly defaultBadgeLabel?: string; // default "Default"
  readonly resetLabel?: string; // default "Reset"
  readonly className?: string;
}

export function WorkbenchPropertyOverrideLabel(
  props: WorkbenchPropertyOverrideLabelProps,
): JSX.Element;
```

Usage:

```tsx
<Field
  label={
    <WorkbenchPropertyOverrideLabel
      label="Timezone"
      overridden={timezoneOverridden}
      onReset={clearTimezoneOverride}
      customBadgeLabel={t('inspector.custom')}
      defaultBadgeLabel={t('inspector.default')}
      resetLabel={t('inspector.reset')}
    />
  }
>
  <Select ... />
</Field>
```

---

## Package home + import rules

- **Home:** `@workbench-kit/react` (primitives or layout/property)
- **May import:** React, existing `Button` / tokens / `cx`
- **Must not import:** Electron, Node `fs`, host domain packages

---

## Acceptance criteria

- [ ] Component exported from the public barrel (or documented subpath) and `pnpm check:public-exports` green
- [ ] Overridden vs default visual states distinguishable without color-only reliance (text badge)
- [ ] Reset absent when not overridden or when `onReset` omitted
- [ ] Reset invokes host handler once per click; no internal state for override boolean
- [ ] Storybook story on **settings/form surface** with both states + Reset action
- [ ] Unit/RTL test for badge text + reset visibility matrix
- [ ] No product/domain schema types in the public API
- [ ] Docs note in consumer-capabilities or property docs (short)

## Verification plan

- Package Vitest/RTL for the visibility matrix
- Storybook: `React/Workbench/Property Override Label` (form frame)
- `pnpm --filter @workbench-kit/react` typecheck/test as applicable
- `pnpm validate:fast` before merge

## Dependencies / related

- Related backlog: `docs/workbench/consumer-integration-backlog.md` (inspector / property surfaces)
- No hard blocker

## Risks / open questions

- Whether to bake into `WorkbenchPropertyCheckboxRow` etc. via a prop vs standalone label helper only — **prefer standalone** for S scope
- Badge copy defaults: keep English Storybook defaults; hosts override via props
