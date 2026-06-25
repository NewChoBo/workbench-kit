import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

import { labelForWorkspaceFileResource } from './resource-uri.js';

export const MISSING_RESOURCE_EDITOR_HOST_RENDER_KIND =
  'workbench-kit.builtin.editor/missing-resource' as const;

export interface MissingResourceEditorHostRenderData {
  readonly kind: typeof MISSING_RESOURCE_EDITOR_HOST_RENDER_KIND;
  readonly message: string;
  readonly resourceUri: string;
}

export interface MissingResourceEditorHostOptions {
  readonly message?: string | undefined;
  readonly resourceUri: string;
  readonly tabId?: string | undefined;
}

export class MissingResourceEditorHost implements EditorHost {
  readonly title: string;
  dirty = false;
  onDidChangeDirty?: (dirty: boolean) => void;

  constructor(private readonly options: MissingResourceEditorHostOptions) {
    this.title = getResourceLabel(options.resourceUri);
  }

  dispose(): void {
    this.onDidChangeDirty = undefined;
  }

  render(): MissingResourceEditorHostRenderData {
    return {
      kind: MISSING_RESOURCE_EDITOR_HOST_RENDER_KIND,
      message: this.options.message ?? 'The file was deleted or moved.',
      resourceUri: this.options.resourceUri,
    };
  }
}

export function isMissingResourceEditorHostRenderData(
  value: unknown,
): value is MissingResourceEditorHostRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<MissingResourceEditorHostRenderData>;
  return (
    candidate.kind === MISSING_RESOURCE_EDITOR_HOST_RENDER_KIND &&
    typeof candidate.resourceUri === 'string' &&
    typeof candidate.message === 'string'
  );
}

function getResourceLabel(resourceUri: string): string {
  return labelForWorkspaceFileResource(resourceUri);
}
