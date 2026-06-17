import {
  createWorkspaceResourceSnapshot,
  type WorkspaceResourceSnapshot,
} from './resource-snapshot.js';
import { parseWorkspaceResourceUri } from './resource-uri.js';
import {
  applyWorkspaceResourceTransaction,
  createWorkspaceResourceTransaction,
  type WorkspaceResourceTransaction,
} from './resource-transaction.js';
import type { WorkspaceResourceMutation } from './resource-mutation.js';
import type { WorkspaceFile } from './types.js';
import {
  initializeVirtualWorkspaceState,
  type VirtualWorkspaceInitialState,
  type VirtualWorkspaceState,
  type WriteWorkspaceFileInput,
} from './virtualWorkspace.js';

export const WORKBENCH_WORKSPACE_CAPABILITY_ID = 'workbench.workspace' as const;

export interface WorkbenchEditorSavePort {
  applySave(resourceUri: string, content: string): { readonly transactionId: string } | undefined;
  resolveResource?(resourceUri: string): unknown;
}

export interface WorkspaceChangeEvent {
  readonly previousSnapshot: WorkspaceResourceSnapshot;
  readonly snapshot: WorkspaceResourceSnapshot;
  readonly state: VirtualWorkspaceState;
  readonly transaction: WorkspaceResourceTransaction;
}

export interface WorkspaceResourceServiceOptions {
  readonly initialState?: VirtualWorkspaceInitialState | undefined;
}

type WorkspaceChangeListener = (event: WorkspaceChangeEvent) => void;

export class WorkspaceResourceService {
  private readonly listeners = new Set<WorkspaceChangeListener>();
  private readonly transactionJournal: WorkspaceResourceTransaction[] = [];
  private snapshot: WorkspaceResourceSnapshot;
  private state: VirtualWorkspaceState;

  constructor(options: WorkspaceResourceServiceOptions = {}) {
    this.state = initializeVirtualWorkspaceState(options.initialState ?? {});
    this.snapshot = createWorkspaceResourceSnapshot(this.state);
  }

  onDidChangeWorkspace(listener: WorkspaceChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): VirtualWorkspaceState {
    return {
      ...this.state,
      expandedPaths: new Set(this.state.expandedPaths),
      files: this.state.files.map((file) => ({ ...file })),
      folders: [...this.state.folders],
      openPaths: [...this.state.openPaths],
    };
  }

  getSnapshot(): WorkspaceResourceSnapshot {
    return {
      files: this.snapshot.files.map((file) => ({ ...file })),
      folders: [...this.snapshot.folders],
      version: this.snapshot.version,
    };
  }

  getTransactionJournal(): readonly WorkspaceResourceTransaction[] {
    return [...this.transactionJournal];
  }

  getFile(path: string): WorkspaceFile | undefined {
    return this.state.files.find((file) => file.path === path);
  }

  getFileByResourceUri(resourceUri: string): WorkspaceFile | undefined {
    const parsed = parseWorkspaceResourceUri(resourceUri);
    if (!parsed || parsed.kind !== 'file') {
      return undefined;
    }

    return this.getFile(parsed.path);
  }

  applyTransaction(transaction: WorkspaceResourceTransaction): VirtualWorkspaceState {
    const previousSnapshot = this.snapshot;
    const nextState = applyWorkspaceResourceTransaction(this.state, transaction);
    if (nextState === this.state) {
      return this.state;
    }

    this.state = nextState;
    this.snapshot = createWorkspaceResourceSnapshot(this.state, previousSnapshot.version + 1);
    this.transactionJournal.push(transaction);

    const event: WorkspaceChangeEvent = {
      previousSnapshot,
      snapshot: this.snapshot,
      state: this.state,
      transaction,
    };
    for (const listener of this.listeners) {
      listener(event);
    }

    return this.state;
  }

  dispose(): void {
    this.listeners.clear();
  }
}

export function buildEditorSaveMutation(
  state: Pick<VirtualWorkspaceState, 'files'>,
  resourceUri: string,
  content: string,
): WorkspaceResourceMutation | undefined {
  const parsed = parseWorkspaceResourceUri(resourceUri);
  if (!parsed || parsed.kind !== 'file') {
    return undefined;
  }

  const fileInput: WriteWorkspaceFileInput = { content };
  const existing = state.files.some((file) => file.path === parsed.path);
  if (existing) {
    return { type: 'save-file', path: parsed.path, file: fileInput };
  }

  return {
    type: 'create-file',
    path: parsed.path,
    file: { path: parsed.path, ...fileInput },
  };
}

export function createEditorSaveTransaction(
  state: Pick<VirtualWorkspaceState, 'files'>,
  resourceUri: string,
  content: string,
  label = 'Save editor',
): WorkspaceResourceTransaction | undefined {
  const mutation = buildEditorSaveMutation(state, resourceUri, content);
  if (!mutation) {
    return undefined;
  }

  return createWorkspaceResourceTransaction({
    label,
    mutations: [mutation],
  });
}

export interface WorkbenchWorkspaceHostPort extends WorkbenchEditorSavePort {
  readonly capabilityId: typeof WORKBENCH_WORKSPACE_CAPABILITY_ID;
  readonly service: WorkspaceResourceService;
  dispose?(): void;
}

export function createWorkbenchWorkspaceHostPort(
  options: WorkspaceResourceServiceOptions = {},
): WorkbenchWorkspaceHostPort {
  const service = new WorkspaceResourceService(options);

  return {
    capabilityId: WORKBENCH_WORKSPACE_CAPABILITY_ID,
    service,
    applySave(resourceUri, content) {
      const transaction = createEditorSaveTransaction(service.getState(), resourceUri, content);
      if (!transaction) {
        return undefined;
      }

      service.applyTransaction(transaction);
      return { transactionId: transaction.id };
    },
    resolveResource(resourceUri) {
      return service.getFileByResourceUri(resourceUri);
    },
    dispose() {
      service.dispose();
    },
  };
}
