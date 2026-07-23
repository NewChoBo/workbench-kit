import type {
  WorkbenchDocument,
  WorkbenchDocumentPatch,
  WorkbenchDocumentPatchOp,
} from './workbench-document';

export interface WorkbenchDocumentPatchResult {
  document: WorkbenchDocument;
  warnings?: WorkbenchDocumentPatchError[];
}

export interface WorkbenchDocumentPatchError {
  code: 'invalid-path' | 'type-mismatch' | 'schema-mismatch' | 'value-parse';
  message: string;
  path: string;
}

export interface WorkbenchDocumentPatchHistoryState {
  past: WorkbenchDocument[];
  present: WorkbenchDocument;
  future: WorkbenchDocument[];
}

export interface WorkbenchDocumentPatchHistory {
  state: WorkbenchDocumentPatchHistoryState;
  applyPatch: (patch: WorkbenchDocumentPatch) => {
    state: WorkbenchDocumentPatchHistoryState;
    result: WorkbenchDocumentPatchResult;
  };
  undo: () => WorkbenchDocumentPatchHistoryState | null;
  redo: () => WorkbenchDocumentPatchHistoryState | null;
  canUndo: boolean;
  canRedo: boolean;
}

export function isWorkbenchDocumentSupported(document: WorkbenchDocument): boolean {
  return document.schemaVersion === 1;
}

export function assertWorkbenchDocument(document: WorkbenchDocument): void {
  if (!isWorkbenchDocumentSupported(document)) {
    throw new Error(`Unsupported schemaVersion: ${document.schemaVersion}`);
  }
}

function parsePointer(path: string): string[] {
  if (path === '') {
    return [];
  }
  if (path[0] === '/') {
    return path
      .slice(1)
      .split('/')
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  }
  return path.split('/').map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveContainer(document: unknown, segments: string[]): unknown {
  let current: unknown = document;
  const target = segments.slice(0, -1);
  for (const segment of target) {
    if (current == null) {
      throw new Error(`path not found: /${segments.join('/')}`);
    }
    if (Array.isArray(current)) {
      const index = segment === '-' ? current.length - 1 : Number(segment);
      current = current[index];
      continue;
    }
    if (typeof current === 'object') {
      const obj = current as Record<string, unknown>;
      current = obj[segment];
      continue;
    }
    throw new Error(`cannot traverse non-container at /${segments.join('/')}`);
  }
  return current;
}

function setValueAtPath(
  document: WorkbenchDocument,
  segments: string[],
  value: unknown,
): WorkbenchDocument {
  if (segments.length === 0) {
    return value as WorkbenchDocument;
  }
  const cloned = cloneDeep(document);
  let current: unknown = cloned;
  const parentSegments = segments.slice(0, -1);
  const key = segments[segments.length - 1];
  for (const segment of parentSegments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index) || index < 0) {
        throw new Error(`invalid array index: ${segment}`);
      }
      if (current[index] === undefined) {
        throw new Error(`missing path segment: ${segment}`);
      }
      current = current[index];
      continue;
    }
    if (current && typeof current === 'object') {
      const obj = current as Record<string, unknown>;
      if (!(segment in obj)) {
        throw new Error(`missing path segment: ${segment}`);
      }
      current = obj[segment];
      continue;
    }
    throw new Error(`invalid path at segment: ${segment}`);
  }
  if (Array.isArray(current)) {
    if (key === '-') {
      current.push(value);
      return cloned;
    }
    const index = Number(key);
    if (!Number.isFinite(index) || index < 0) {
      throw new Error(`invalid array index: ${key}`);
    }
    current.splice(index, 0, value);
    return cloned;
  }
  if (current && typeof current === 'object') {
    (current as Record<string, unknown>)[key] = value;
    return cloned;
  }
  throw new Error(`cannot write into non-object: /${segments.join('/')}`);
}

function removeValueAtPath(document: WorkbenchDocument, segments: string[]): WorkbenchDocument {
  if (segments.length === 0) {
    throw new Error('remove root is unsupported');
  }
  const cloned = cloneDeep(document);
  let current: unknown = cloned;
  const parentSegments = segments.slice(0, -1);
  const key = segments[segments.length - 1];
  for (const segment of parentSegments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index) || index < 0) {
        throw new Error(`invalid array index: ${segment}`);
      }
      current = current[index];
      continue;
    }
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
      continue;
    }
    throw new Error(`invalid path: /${segments.join('/')}`);
  }
  if (Array.isArray(current)) {
    if (key === '-') {
      throw new Error('invalid array index: "-"');
    }
    const index = Number(key);
    if (!Number.isFinite(index) || index < 0) {
      throw new Error(`invalid array index: ${key}`);
    }
    current.splice(index, 1);
    return cloned;
  }
  if (current && typeof current === 'object') {
    delete (current as Record<string, unknown>)[key];
    return cloned;
  }
  throw new Error(`invalid parent container: /${segments.join('/')}`);
}

function replaceValueAtPath(
  document: WorkbenchDocument,
  segments: string[],
  value: unknown,
): WorkbenchDocument {
  if (segments.length === 0) {
    return value as WorkbenchDocument;
  }
  const cloned = cloneDeep(document);
  let current: unknown = cloned;
  const parentSegments = segments.slice(0, -1);
  const key = segments[segments.length - 1];
  for (const segment of parentSegments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index) || index < 0) {
        throw new Error(`invalid array index: ${segment}`);
      }
      current = current[index];
      continue;
    }
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
      continue;
    }
    throw new Error(`invalid path: /${segments.join('/')}`);
  }
  if (Array.isArray(current)) {
    if (key === '-') {
      throw new Error('invalid array index: "-"');
    }
    const index = Number(key);
    if (!Number.isFinite(index) || index < 0) {
      throw new Error(`invalid array index: ${key}`);
    }
    current[index] = value;
    return cloned;
  }
  if (current && typeof current === 'object') {
    (current as Record<string, unknown>)[key] = value;
    return cloned;
  }
  throw new Error(`invalid parent container: /${segments.join('/')}`);
}

function applySingleOp(
  document: WorkbenchDocument,
  op: WorkbenchDocumentPatchOp,
): WorkbenchDocument {
  const segments = parsePointer(op.path);
  switch (op.op) {
    case 'add':
      return setValueAtPath(document, segments, op.value);
    case 'remove':
      return removeValueAtPath(document, segments);
    case 'replace':
      return replaceValueAtPath(document, segments, op.value);
    case 'move': {
      const fromSegments = parsePointer(op.from);
      const sourceParent = resolveContainer(document, fromSegments);
      if (sourceParent == null) {
        throw new Error(`invalid move source: ${op.from}`);
      }
      const sourceKey = fromSegments[fromSegments.length - 1];
      let movingValue: unknown;
      if (Array.isArray(sourceParent)) {
        const idx = Number(sourceKey);
        if (!Number.isFinite(idx) || idx < 0 || idx >= sourceParent.length) {
          throw new Error(`invalid move source index: ${op.from}`);
        }
        movingValue = sourceParent[idx];
      } else if (sourceParent && typeof sourceParent === 'object') {
        movingValue = (sourceParent as Record<string, unknown>)[sourceKey];
      } else {
        throw new Error(`invalid move source container: ${op.from}`);
      }
      const removed = removeValueAtPath(document, fromSegments);
      return setValueAtPath(removed, parsePointer(op.path), movingValue);
    }
    default:
      return document;
  }
}

export function applyWorkbenchDocumentPatch(
  document: WorkbenchDocument,
  patch: WorkbenchDocumentPatch,
): WorkbenchDocumentPatchResult {
  assertWorkbenchDocument(document);
  if (patch.schemaVersion !== document.schemaVersion) {
    throw new Error(
      `schemaVersion mismatch: patch(${patch.schemaVersion}) != doc(${document.schemaVersion})`,
    );
  }

  let current = document;
  const warnings: WorkbenchDocumentPatchError[] = [];
  for (const op of patch.ops) {
    try {
      current = applySingleOp(current, op);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      warnings.push({ code: 'invalid-path', path: op.path, message });
      const error = new Error(`Failed to apply patch(${patch.id}) at ${op.path}: ${message}`);
      (error as Error & { cause: unknown }).cause = caught;
      throw error;
    }
  }
  return { document: current, warnings };
}

export function deserializeWorkbenchDocumentPatch(raw: unknown): WorkbenchDocumentPatch | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const candidate = raw as WorkbenchDocumentPatch;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.timestamp !== 'string' ||
    typeof candidate.schemaVersion !== 'number' ||
    !Array.isArray(candidate.ops)
  ) {
    return null;
  }
  return candidate;
}

export function initializeWorkbenchDocumentPatchHistory(
  initial: WorkbenchDocument,
): WorkbenchDocumentPatchHistory {
  assertWorkbenchDocument(initial);
  let state: WorkbenchDocumentPatchHistoryState = {
    past: [],
    present: initial,
    future: [],
  };

  return {
    get state() {
      return state;
    },
    get canUndo() {
      return state.past.length > 0;
    },
    get canRedo() {
      return state.future.length > 0;
    },
    applyPatch(patch) {
      const result = applyWorkbenchDocumentPatch(state.present, patch);
      state = {
        past: [...state.past, state.present],
        present: result.document,
        future: [],
      };
      return { state, result };
    },
    undo() {
      if (!state.past.length) {
        return null;
      }
      const previous = state.past[state.past.length - 1];
      state = {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
      return state;
    },
    redo() {
      if (!state.future.length) {
        return null;
      }
      const [next, ...restFuture] = state.future;
      state = {
        past: [...state.past, state.present],
        present: next,
        future: restFuture,
      };
      return state;
    },
  };
}
