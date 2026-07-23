import { normalizeWorkspacePath } from '@workbench-kit/workspace';
import type {
  CreateWorkspaceFileInput,
  WriteWorkspaceFileInput,
  WorkspaceFile,
} from '@workbench-kit/workspace';
import type { SaveInput, WorkspaceFileRepository } from '@workbench-kit/contracts';

export interface WorkspaceFileRepositoryCallbacks {
  createFile: (file: CreateWorkspaceFileInput) => void;
  deleteFile: (path: string) => void;
  saveFile: (path: string, file: WriteWorkspaceFileInput) => void;
}

export interface WorkspaceFileAdapterState {
  getFiles: () => WorkspaceFile[];
  files: WorkspaceFile[];
}

const cloneFile = (file: WorkspaceFile): WorkspaceFile => ({ ...file });

function normalizeInputPath(path: string) {
  return normalizeWorkspacePath(path.trim());
}

export class InMemoryWorkspaceFileRepository implements WorkspaceFileRepository {
  private readonly files = new Map<string, WorkspaceFile>();

  private readonly onCreateFile?: (file: CreateWorkspaceFileInput) => void;
  private readonly onDeleteFile?: (path: string) => void;
  private readonly onSaveFile?: (path: string, file: WriteWorkspaceFileInput) => void;

  constructor(
    files: readonly WorkspaceFile[] = [],
    callbacks: {
      onCreateFile?: (file: CreateWorkspaceFileInput) => void;
      onDeleteFile?: (path: string) => void;
      onSaveFile?: (path: string, file: WriteWorkspaceFileInput) => void;
    } = {},
  ) {
    files.forEach((file) => {
      const path = normalizeWorkspacePath(file.path);
      if (!path) return;
      this.files.set(path, { ...file, path });
    });
    this.onCreateFile = callbacks.onCreateFile;
    this.onDeleteFile = callbacks.onDeleteFile;
    this.onSaveFile = callbacks.onSaveFile;
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = normalizeInputPath(path);
    if (!normalizedPath) return;
    if (!this.files.has(normalizedPath)) return;

    this.files.delete(normalizedPath);
    this.onDeleteFile?.(normalizedPath);
  }

  async getFile(path: string): Promise<WorkspaceFile | null> {
    const normalizedPath = normalizeInputPath(path);
    if (!normalizedPath) return null;

    const file = this.files.get(normalizedPath);
    return file ? { ...file } : null;
  }

  async listFiles(): Promise<readonly WorkspaceFile[]> {
    return [...this.files.values()].map(cloneFile);
  }

  async writeFile(input: SaveInput): Promise<WorkspaceFile> {
    const normalizedPath = normalizeInputPath(input.path);
    if (!normalizedPath) {
      throw new Error('Invalid workspace path.');
    }

    const current = await this.getFile(normalizedPath);
    if (current && input.expectedUpdatedAt && current.updatedAt !== input.expectedUpdatedAt) {
      throw new Error('Stale file version.');
    }

    const next: WorkspaceFile = {
      content: input.content,
      mimeType: input.mimeType ?? current?.mimeType,
      path: normalizedPath,
      source: input.source ?? current?.source,
      updatedAt: input.updatedAt ?? current?.updatedAt,
    };

    this.files.set(normalizedPath, next);

    if (current) {
      this.onSaveFile?.(normalizedPath, {
        content: input.content,
        source: input.source,
        updatedAt: input.updatedAt,
      });
    } else {
      this.onCreateFile?.({
        content: input.content,
        mimeType: input.mimeType,
        path: normalizedPath,
        source: input.source,
        updatedAt: input.updatedAt,
      });
    }

    return next;
  }
}

export function createWorkspaceFileRepository({
  createFile,
  deleteFile,
  files,
  saveFile,
}: WorkspaceFileRepositoryCallbacks & {
  files: WorkspaceFile[];
}): WorkspaceFileRepository {
  return new InMemoryWorkspaceFileRepository(files, {
    onCreateFile: createFile,
    onDeleteFile: deleteFile,
    onSaveFile: (path, file) => saveFile(path, file),
  });
}
