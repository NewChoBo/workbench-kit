import {
  isWorkspacePatchDeleteFile,
  type WorkspaceFile,
  type WorkspaceFileRepository,
  type WorkspacePatchApplyResult,
  type WorkspacePatchEvent,
  type WorkspacePatchSource,
  type WorkspacePatchWriteFile,
} from '@newchobo-ui/contracts';

export interface WorkspacePatchServiceOptions {
  repository: WorkspaceFileRepository;
  now?: () => string;
}

export class WorkspacePatchService {
  private readonly repository: WorkspaceFileRepository;
  private readonly now: () => string;

  constructor({ now = () => new Date().toISOString(), repository }: WorkspacePatchServiceOptions) {
    this.now = now;
    this.repository = repository;
  }

  async applyPatch(patch: WorkspacePatchEvent): Promise<WorkspacePatchApplyResult> {
    const path = this.normalizePath(patch.path);
    if (!path) {
      return {
        code: 'invalid-path',
        message: 'Patch path is required.',
        patch,
        type: 'patch:failed',
      };
    }

    if (isWorkspacePatchDeleteFile(patch)) {
      const target = await this.repository.getFile(path);
      if (!target) {
        return {
          code: 'not-found',
          message: `No file exists at '${path}'.`,
          patch,
          type: 'patch:failed',
        };
      }

      await this.repository.deleteFile(path);
      return {
        patch,
        type: 'patch:applied',
      };
    }

    const writePatch = patch as WorkspacePatchWriteFile;
    const file: WorkspaceFile = {
      content: writePatch.content,
      mimeType: writePatch.mimeType,
      path,
      source: normalizePatchSource(writePatch.source),
      updatedAt: writePatch.updatedAt ?? this.now(),
    };
    await this.repository.writeFile(file);
    return {
      patch,
      type: 'patch:applied',
    };
  }

  private normalizePath(path: string) {
    return path.trim().replace(/\\+/, '/').replace(/\/+/g, '/');
  }
}

function normalizePatchSource(source: WorkspacePatchSource | undefined): WorkspaceFile['source'] {
  return source === 'assistant' || source === 'user' ? source : undefined;
}
