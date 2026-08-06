import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

const FIELD_REMAP_URI_PREFIX = 'workbench://field-remap/' as const;

export const FIELD_REMAP_EDITOR_ID = 'workbench-kit.samples.field-remap.editor' as const;
export const FIELD_REMAP_EDITOR_HOST_RENDER_KIND =
  'workbench-kit.samples.field-remap/editor' as const;

/** Keep in sync with shell-react `FIELD_REMAP_SAMPLES` ids/titles. */
export const FIELD_REMAP_SAMPLE_META = {
  'nested-ab': { title: 'A → B' },
  't-user-contact': { title: 'T_USER → T_CONTACT' },
  't-event-time': { title: 'T_EVENT → T_SLOT' },
  't-emp-dept': { title: 'T_EMP → T_EMP_ROW' },
  't-product-catalog': { title: 'T_PRODUCT → T_CATALOG_ITEM' },
  documentation: { title: 'Field Remap docs' },
} as const;

export type FieldRemapEditorSurfaceId = keyof typeof FIELD_REMAP_SAMPLE_META | string;

export interface FieldRemapEditorHostRenderData {
  readonly kind: typeof FIELD_REMAP_EDITOR_HOST_RENDER_KIND;
  readonly resourceUri: string;
  readonly surfaceId: string;
}

export interface FieldRemapEditorHostOptions {
  readonly resourceUri: string;
}

export function buildFieldRemapEditorUri(surfaceId: string): string {
  return `${FIELD_REMAP_URI_PREFIX}${encodeURIComponent(surfaceId)}`;
}

export function parseFieldRemapEditorUri(resourceUri: string): string | undefined {
  if (!resourceUri.startsWith(FIELD_REMAP_URI_PREFIX)) {
    return undefined;
  }

  const encodedId = resourceUri.slice(FIELD_REMAP_URI_PREFIX.length);
  if (!encodedId) {
    return undefined;
  }

  try {
    const surfaceId = decodeURIComponent(encodedId);
    if (!surfaceId) {
      return undefined;
    }
    return surfaceId;
  } catch {
    return undefined;
  }
}

export function isFieldRemapEditorUri(resourceUri: string): boolean {
  return parseFieldRemapEditorUri(resourceUri) !== undefined;
}

function titleForSurface(surfaceId: string): string {
  const meta = FIELD_REMAP_SAMPLE_META[surfaceId as keyof typeof FIELD_REMAP_SAMPLE_META];
  return meta?.title ?? surfaceId;
}

export class FieldRemapEditorHost implements EditorHost {
  readonly title: string;
  dirty = false;
  onDidChangeDirty?: (dirty: boolean) => void;

  private readonly surfaceId: string;

  constructor(private readonly options: FieldRemapEditorHostOptions) {
    const surfaceId = parseFieldRemapEditorUri(options.resourceUri);
    if (!surfaceId) {
      throw new Error(`Invalid Schema Mapper resource URI: ${options.resourceUri}`);
    }

    this.surfaceId = surfaceId;
    this.title = titleForSurface(surfaceId);
  }

  dispose(): void {
    this.onDidChangeDirty = undefined;
  }

  render(): FieldRemapEditorHostRenderData {
    return {
      kind: FIELD_REMAP_EDITOR_HOST_RENDER_KIND,
      resourceUri: this.options.resourceUri,
      surfaceId: this.surfaceId,
    };
  }
}

export function isFieldRemapEditorHostRenderData(
  value: unknown,
): value is FieldRemapEditorHostRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<FieldRemapEditorHostRenderData>;
  return (
    candidate.kind === FIELD_REMAP_EDITOR_HOST_RENDER_KIND &&
    typeof candidate.resourceUri === 'string' &&
    typeof candidate.surfaceId === 'string' &&
    candidate.surfaceId.length > 0
  );
}
