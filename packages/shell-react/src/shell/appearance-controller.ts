import { applyThemeTokenOverrides, sanitizeThemeTokenValue } from '@workbench-kit/workbench-core';

export type WorkbenchAppearanceOverrideSnapshot = Readonly<Record<string, string>>;

export interface WorkbenchDocumentAppearanceOverrideController {
  getSnapshot(): WorkbenchAppearanceOverrideSnapshot | undefined;
  update(
    tokenOverrides: Readonly<Record<string, string>> | undefined,
  ): WorkbenchAppearanceOverrideSnapshot | undefined;
  dispose(): void;
}

export interface WorkbenchAppearanceDiagnosticSnapshot {
  readonly unresolvedTheme?: string | undefined;
  readonly unresolvedThemePreset?: string | undefined;
}

export interface WorkbenchDocumentAppearanceDiagnosticController {
  update(snapshot: WorkbenchAppearanceDiagnosticSnapshot): void;
  dispose(): void;
}

interface PropertyBaseline {
  readonly priority: string;
  readonly value: string;
}

interface OverrideOwner {
  readonly generation: symbol;
  snapshot: WorkbenchAppearanceOverrideSnapshot | undefined;
}

interface DocumentOverrideState {
  readonly baselines: Map<string, PropertyBaseline>;
  readonly owners: OverrideOwner[];
  readonly target: HTMLElement;
}

const documentOverrideStates = new WeakMap<HTMLElement, DocumentOverrideState>();

const APPEARANCE_DIAGNOSTIC_ATTRIBUTES = Object.freeze({
  unresolvedTheme: 'data-workbench-unresolved-theme',
  unresolvedThemePreset: 'data-workbench-unresolved-theme-preset',
} as const);

interface DiagnosticOwner {
  readonly generation: symbol;
  snapshot: WorkbenchAppearanceDiagnosticSnapshot;
}

interface DocumentDiagnosticState {
  readonly baselines: Readonly<Record<keyof WorkbenchAppearanceDiagnosticSnapshot, string | null>>;
  readonly owners: DiagnosticOwner[];
  readonly target: HTMLElement;
}

const documentDiagnosticStates = new WeakMap<HTMLElement, DocumentDiagnosticState>();

/**
 * Copies only own data properties and freezes their canonically sanitized CSS values.
 * Accessors are deliberately not evaluated at this compatibility boundary.
 */
export function createWorkbenchAppearanceOverrideSnapshot(
  tokenOverrides: Readonly<Record<string, string>> | undefined,
): WorkbenchAppearanceOverrideSnapshot | undefined {
  if (tokenOverrides === undefined) {
    return undefined;
  }

  const snapshot: Record<string, string> = {};
  for (const key of Object.keys(tokenOverrides)) {
    if (!key.startsWith('--')) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(tokenOverrides, key);
    if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'string') {
      continue;
    }

    const sanitized = sanitizeThemeTokenValue(descriptor.value);
    if (sanitized === null) {
      continue;
    }

    Object.defineProperty(snapshot, key, {
      configurable: true,
      enumerable: true,
      value: sanitized,
      writable: true,
    });
  }

  return Object.freeze(snapshot);
}

/**
 * Registers one shell as a document legacy-override owner. The most recently registered live
 * owner wins as one complete record; older cleanup cannot overwrite it. This coordinator owns
 * CSS properties only and never reads or writes appearance attributes or descendants.
 */
export function createWorkbenchDocumentAppearanceOverrideController(
  target: HTMLElement,
  initialTokenOverrides?: Readonly<Record<string, string>>,
): WorkbenchDocumentAppearanceOverrideController {
  const state = getOrCreateDocumentOverrideState(target);
  const owner: OverrideOwner = {
    generation: Symbol('workbench-appearance-override'),
    snapshot: createWorkbenchAppearanceOverrideSnapshot(initialTokenOverrides),
  };

  captureBaselines(state, owner.snapshot);
  state.owners.push(owner);
  applyCurrentOwner(state);

  let disposed = false;
  return {
    getSnapshot() {
      return owner.snapshot;
    },
    update(tokenOverrides) {
      if (disposed || !hasOwner(state, owner.generation)) {
        return owner.snapshot;
      }

      const nextSnapshot = createWorkbenchAppearanceOverrideSnapshot(tokenOverrides);
      captureBaselines(state, nextSnapshot);
      owner.snapshot = nextSnapshot;

      if (isCurrentOwner(state, owner.generation)) {
        applyCurrentOwner(state);
      }
      releaseUnusedBaselines(state);
      return owner.snapshot;
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;

      const ownerIndex = state.owners.findIndex(
        (candidate) => candidate.generation === owner.generation,
      );
      if (ownerIndex < 0) {
        return;
      }

      const wasCurrentOwner = ownerIndex === state.owners.length - 1;
      state.owners.splice(ownerIndex, 1);
      if (wasCurrentOwner) {
        applyCurrentOwner(state);
      }
      releaseUnusedBaselines(state);

      if (state.owners.length === 0) {
        documentOverrideStates.delete(target);
      }
    },
  };
}

/** Coordinates only private, unstyled unresolved-selection diagnostics on the document root. */
export function createWorkbenchDocumentAppearanceDiagnosticController(
  target: HTMLElement,
  initialSnapshot: WorkbenchAppearanceDiagnosticSnapshot = {},
): WorkbenchDocumentAppearanceDiagnosticController {
  const state = getOrCreateDocumentDiagnosticState(target);
  const owner: DiagnosticOwner = {
    generation: Symbol('workbench-appearance-diagnostic'),
    snapshot: freezeDiagnosticSnapshot(initialSnapshot),
  };
  state.owners.push(owner);
  applyCurrentDiagnosticOwner(state);

  let disposed = false;
  return {
    update(snapshot) {
      if (
        disposed ||
        !state.owners.some((candidate) => candidate.generation === owner.generation)
      ) {
        return;
      }
      owner.snapshot = freezeDiagnosticSnapshot(snapshot);
      if (state.owners[state.owners.length - 1]?.generation === owner.generation) {
        applyCurrentDiagnosticOwner(state);
      }
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      const ownerIndex = state.owners.findIndex(
        (candidate) => candidate.generation === owner.generation,
      );
      if (ownerIndex < 0) {
        return;
      }
      const wasCurrent = ownerIndex === state.owners.length - 1;
      state.owners.splice(ownerIndex, 1);
      if (wasCurrent) {
        applyCurrentDiagnosticOwner(state);
      }
      if (state.owners.length === 0) {
        documentDiagnosticStates.delete(target);
      }
    },
  };
}

function freezeDiagnosticSnapshot(
  snapshot: WorkbenchAppearanceDiagnosticSnapshot,
): WorkbenchAppearanceDiagnosticSnapshot {
  return Object.freeze({
    unresolvedTheme:
      typeof snapshot.unresolvedTheme === 'string' ? snapshot.unresolvedTheme : undefined,
    unresolvedThemePreset:
      typeof snapshot.unresolvedThemePreset === 'string'
        ? snapshot.unresolvedThemePreset
        : undefined,
  });
}

function getOrCreateDocumentDiagnosticState(target: HTMLElement): DocumentDiagnosticState {
  const existing = documentDiagnosticStates.get(target);
  if (existing) {
    return existing;
  }
  const state: DocumentDiagnosticState = {
    baselines: Object.freeze({
      unresolvedTheme: target.getAttribute(APPEARANCE_DIAGNOSTIC_ATTRIBUTES.unresolvedTheme),
      unresolvedThemePreset: target.getAttribute(
        APPEARANCE_DIAGNOSTIC_ATTRIBUTES.unresolvedThemePreset,
      ),
    }),
    owners: [],
    target,
  };
  documentDiagnosticStates.set(target, state);
  return state;
}

function applyCurrentDiagnosticOwner(state: DocumentDiagnosticState): void {
  const current = state.owners[state.owners.length - 1]?.snapshot;
  for (const key of Object.keys(APPEARANCE_DIAGNOSTIC_ATTRIBUTES) as Array<
    keyof WorkbenchAppearanceDiagnosticSnapshot
  >) {
    const attribute = APPEARANCE_DIAGNOSTIC_ATTRIBUTES[key];
    const value = current === undefined ? state.baselines[key] : current[key];
    if (value === null || value === undefined) {
      state.target.removeAttribute(attribute);
    } else {
      state.target.setAttribute(attribute, value);
    }
  }
}

function getOrCreateDocumentOverrideState(target: HTMLElement): DocumentOverrideState {
  const existing = documentOverrideStates.get(target);
  if (existing) {
    return existing;
  }

  const state: DocumentOverrideState = {
    baselines: new Map(),
    owners: [],
    target,
  };
  documentOverrideStates.set(target, state);
  return state;
}

function captureBaselines(
  state: DocumentOverrideState,
  snapshot: WorkbenchAppearanceOverrideSnapshot | undefined,
): void {
  if (!snapshot) {
    return;
  }

  for (const key of Object.keys(snapshot)) {
    if (state.baselines.has(key)) {
      continue;
    }
    state.baselines.set(key, {
      priority: state.target.style.getPropertyPriority(key),
      value: state.target.style.getPropertyValue(key),
    });
  }
}

function applyCurrentOwner(state: DocumentOverrideState): void {
  for (const [key, baseline] of state.baselines) {
    restoreProperty(state.target, key, baseline);
  }

  const currentOwner = state.owners[state.owners.length - 1];
  applyThemeTokenOverrides(state.target, currentOwner?.snapshot);
}

function releaseUnusedBaselines(state: DocumentOverrideState): void {
  for (const [key, baseline] of state.baselines) {
    const isStillOwned = state.owners.some(
      (owner) =>
        owner.snapshot !== undefined && Object.prototype.hasOwnProperty.call(owner.snapshot, key),
    );
    if (isStillOwned) {
      continue;
    }

    restoreProperty(state.target, key, baseline);
    state.baselines.delete(key);
  }
}

function restoreProperty(target: HTMLElement, key: string, baseline: PropertyBaseline): void {
  if (baseline.value === '') {
    target.style.removeProperty(key);
    return;
  }
  target.style.setProperty(key, baseline.value, baseline.priority);
}

function hasOwner(state: DocumentOverrideState, generation: symbol): boolean {
  return state.owners.some((owner) => owner.generation === generation);
}

function isCurrentOwner(state: DocumentOverrideState, generation: symbol): boolean {
  return state.owners[state.owners.length - 1]?.generation === generation;
}
