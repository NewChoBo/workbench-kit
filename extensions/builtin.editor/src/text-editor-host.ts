import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

export const TEXT_EDITOR_HOST_RENDER_KIND = 'workbench-kit.builtin.editor/text' as const;

export interface TextEditorHostRenderData {
  readonly initialContent: string;
  readonly kind: typeof TEXT_EDITOR_HOST_RENDER_KIND;
  readonly resourceUri: string;
}

export interface TextEditorHostOptions {
  readonly initialContent?: string | undefined;
  readonly resourceUri: string;
  readonly tabId?: string | undefined;
}

export class TextEditorHost implements EditorHost {
  dirty = false;
  readonly title: string;
  onDidChangeDirty?: (dirty: boolean) => void;
  private content: string;

  constructor(private readonly options: TextEditorHostOptions) {
    this.title = getResourceLabel(options.resourceUri);
    this.content = options.initialContent ?? createPlaceholderContent(options.resourceUri);
  }

  getContent(): string {
    return this.content;
  }

  setContent(nextContent: string): void {
    this.content = nextContent;
  }

  markDirty(): void {
    this.setDirty(true);
  }

  setDirty(nextDirty: boolean): void {
    if (this.dirty === nextDirty) {
      return;
    }

    this.dirty = nextDirty;
    this.onDidChangeDirty?.(nextDirty);
  }

  dispose(): void {
    this.onDidChangeDirty = undefined;
  }

  render(): TextEditorHostRenderData {
    return {
      initialContent: this.content,
      kind: TEXT_EDITOR_HOST_RENDER_KIND,
      resourceUri: this.options.resourceUri,
    };
  }
}

export function isTextEditorHostRenderData(value: unknown): value is TextEditorHostRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<TextEditorHostRenderData>;
  return (
    candidate.kind === TEXT_EDITOR_HOST_RENDER_KIND &&
    typeof candidate.resourceUri === 'string' &&
    typeof candidate.initialContent === 'string'
  );
}

function getResourceLabel(resourceUri: string): string {
  const path = resourceUri.startsWith('workspace://file/')
    ? resourceUri.slice('workspace://file/'.length)
    : resourceUri;

  const segments = path.split('/');
  return segments[segments.length - 1] || path;
}

function createPlaceholderContent(resourceUri: string): string {
  const label = getResourceLabel(resourceUri);
  return `// ${label}\n// Opened from ${resourceUri}\n`;
}
