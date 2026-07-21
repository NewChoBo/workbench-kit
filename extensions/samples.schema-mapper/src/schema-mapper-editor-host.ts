import type { EditorHost } from '@workbench-kit/workbench-extension-sdk';

const SCHEMA_MAPPER_URI_PREFIX = 'workbench://schema-mapper/' as const;

export const SCHEMA_MAPPER_EDITOR_ID = 'workbench-kit.samples.schema-mapper.editor' as const;
export const SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND =
  'workbench-kit.samples.schema-mapper/editor' as const;

/** Keep in sync with shell-react `FIELD_REMAP_SAMPLES` ids/titles. */
export const SCHEMA_MAPPER_SAMPLE_META = {
  'nested-ab': { title: 'A → B' },
  't-user-contact': { title: 'T_USER → T_CONTACT' },
  't-event-time': { title: 'T_EVENT → T_SLOT' },
  't-emp-dept': { title: 'T_EMP → T_EMP_ROW' },
  't-product-catalog': { title: 'T_PRODUCT → T_CATALOG_ITEM' },
  // Legacy aliases
  'interactive-bindings': { title: 'A → B' },
  't-order-invoice': { title: 'T_EVENT → T_SLOT' },
  documentation: { title: 'Field Remap docs' },
} as const;

export type SchemaMapperEditorSurfaceId = keyof typeof SCHEMA_MAPPER_SAMPLE_META | string;

export interface SchemaMapperEditorHostRenderData {
  readonly kind: typeof SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND;
  readonly resourceUri: string;
  readonly surfaceId: string;
}

export interface SchemaMapperEditorHostOptions {
  readonly resourceUri: string;
}

const LEGACY_ALIASES: Readonly<Record<string, string>> = {
  'interactive-bindings': 'nested-ab',
  't-order-invoice': 't-event-time',
};

export function buildSchemaMapperEditorUri(surfaceId: string): string {
  return `${SCHEMA_MAPPER_URI_PREFIX}${encodeURIComponent(surfaceId)}`;
}

export function parseSchemaMapperEditorUri(resourceUri: string): string | undefined {
  if (!resourceUri.startsWith(SCHEMA_MAPPER_URI_PREFIX)) {
    return undefined;
  }

  const encodedId = resourceUri.slice(SCHEMA_MAPPER_URI_PREFIX.length);
  if (!encodedId) {
    return undefined;
  }

  try {
    const surfaceId = decodeURIComponent(encodedId);
    if (!surfaceId) {
      return undefined;
    }
    return LEGACY_ALIASES[surfaceId] ?? surfaceId;
  } catch {
    return undefined;
  }
}

export function isSchemaMapperEditorUri(resourceUri: string): boolean {
  return parseSchemaMapperEditorUri(resourceUri) !== undefined;
}

function titleForSurface(surfaceId: string): string {
  const meta = SCHEMA_MAPPER_SAMPLE_META[surfaceId as keyof typeof SCHEMA_MAPPER_SAMPLE_META];
  return meta?.title ?? surfaceId;
}

export class SchemaMapperEditorHost implements EditorHost {
  readonly title: string;
  dirty = false;
  onDidChangeDirty?: (dirty: boolean) => void;

  private readonly surfaceId: string;

  constructor(private readonly options: SchemaMapperEditorHostOptions) {
    const surfaceId = parseSchemaMapperEditorUri(options.resourceUri);
    if (!surfaceId) {
      throw new Error(`Invalid Schema Mapper resource URI: ${options.resourceUri}`);
    }

    this.surfaceId = surfaceId;
    this.title = titleForSurface(surfaceId);
  }

  dispose(): void {
    this.onDidChangeDirty = undefined;
  }

  render(): SchemaMapperEditorHostRenderData {
    return {
      kind: SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND,
      resourceUri: this.options.resourceUri,
      surfaceId: this.surfaceId,
    };
  }
}

export function isSchemaMapperEditorHostRenderData(
  value: unknown,
): value is SchemaMapperEditorHostRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SchemaMapperEditorHostRenderData>;
  return (
    candidate.kind === SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND &&
    typeof candidate.resourceUri === 'string' &&
    typeof candidate.surfaceId === 'string' &&
    candidate.surfaceId.length > 0
  );
}
