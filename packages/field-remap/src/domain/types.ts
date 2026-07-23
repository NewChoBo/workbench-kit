/**
 * Shared field / slot / edge types for field-remap UIs.
 */

export type FieldDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  /**
   * Plain object (record) — e.g. for `string:template` object → string.
   */
  | 'object'
  /**
   * Collection hint — badge + array→array wiring.
   * Optional per-item projection via `MappingEdge.itemSourcePath`.
   */
  | 'array'
  | 'unknown';

export interface SourceField {
  readonly id: string;
  readonly label: string;
  /** Dot-path or capability path hint for hosts. */
  readonly path?: string;
  /**
   * Owning managed shape id when fields are merged from multiple source shapes.
   * Used by `convertToShape` to pick the correct named input bag.
   */
  readonly shapeId?: string;
  readonly dataType?: FieldDataType;
  /** Optional sample used by live preview / transform labels. */
  readonly sampleValue?: unknown;
  readonly group?: string;
  readonly children?: readonly SourceField[];
}

export interface TargetSlot {
  readonly id: string;
  readonly label: string;
  /**
   * Dot-path used when assembling nested JSON output via `convertToShape`.
   * When omitted, hosts may fall back to slot id / label.
   */
  readonly path?: string;
  readonly dataType?: FieldDataType;
  readonly required?: boolean;
  readonly description?: string;
  /** Nested slot groups (expand/collapse in the mapper tree). */
  readonly children?: readonly TargetSlot[];
}

export interface MappingEdge {
  readonly id: string;
  readonly sourceFieldId: string;
  readonly targetSlotId: string;
  /**
   * Ordered transform chain (max 3). Empty / omitted means identity.
   * Prefer this over `transformId` for new writers.
   * For arrays: use reduce builtins (`array:join`, `array:first`, …) here after
   * optional item projection / item transforms.
   */
  readonly transformIds?: readonly string[];
  /**
   * Legacy single transform. Prefer `transformIds`.
   * Readers should use `edgeTransformIds` / `normalizeMappingEdge`.
   * `null` / omitted (with no `transformIds`) means identity (pass-through).
   */
  readonly transformId?: string | null;
  /**
   * Per-step options aligned with `transformIds` (index N applies to step N).
   * Prefer this when steps need different bags (e.g. `showSeconds` then `maxLength`).
   */
  readonly transformOptionSteps?: readonly (Readonly<Record<string, unknown>> | undefined)[];
  /**
   * Shared options for all `transformIds` steps (legacy / apply-to-all).
   * Used when `transformOptionSteps` is omitted. Still written as a back-compat
   * summary of step 0 (or the first non-empty step) by `normalizeMappingEdge`.
   */
  readonly transformOptions?: Readonly<Record<string, unknown>>;
  /**
   * When the source is an array of objects, optional dotted path into each item
   * (e.g. `name` or `meta.label`) before the value is written to the target.
   * Omit / empty for whole-array pass-through (or reduce on the full array).
   */
  readonly itemSourcePath?: string;
  /**
   * Ordered per-item transform chain (max 3) applied after `itemSourcePath`
   * projection (or to each element when projecting is a no-op). Empty / omitted
   * means identity per item. Independent of `transformIds` (which run on the
   * whole collection afterward — e.g. reduce).
   */
  readonly itemTransformIds?: readonly string[];
  /**
   * Per-step options aligned with `itemTransformIds`.
   */
  readonly itemTransformOptionSteps?: readonly (Readonly<Record<string, unknown>> | undefined)[];
  /**
   * Shared options for all `itemTransformIds` steps (legacy / apply-to-all).
   * Independent of `transformOptions` / `transformOptionSteps`.
   */
  readonly itemTransformOptions?: Readonly<Record<string, unknown>>;
  /**
   * List-context child bindings (Stedi-style): when source is an array of objects,
   * each element is converted through these edges into a target item object.
   * Child `sourceFieldId` / `targetSlotId` should resolve to item-schema fields
   * (ingest ids like `a.tags.item.name`) whose `path` is item-relative.
   *
   * Takes precedence over `itemSourcePath` / `itemTransformIds` for the outer edge.
   * Nested `itemEdges` on children are ignored (one collection level per edge).
   */
  readonly itemEdges?: readonly MappingEdge[];
}

/**
 * Minimal JSON-serializable mapping document for host persistence.
 * Hosts own schema trees; this document stores the binding graph only.
 */
export interface FieldRemapDocument {
  readonly version: 1;
  readonly edges: readonly MappingEdge[];
}

export interface TransformContext {
  readonly locale?: string;
  /** Reference instant for time/date presets; defaults to `new Date()`. */
  readonly now?: Date;
  readonly sampleValue?: unknown;
  /**
   * Optional plain object for `string:template` placeholder resolution when the
   * transform input is not itself an object (hosts / demos).
   */
  readonly record?: Readonly<Record<string, unknown>>;
  readonly options?: Readonly<Record<string, unknown>>;
  /**
   * Optional cancellation signal. `applyTransformChain` / `convertToShape` check
   * between steps and reject with `AbortError` when aborted.
   */
  readonly signal?: AbortSignal;
}

/** Declares a host-editable option consumed via `context.options[key]`. */
export interface TransformOptionField {
  readonly key: string;
  readonly label: string;
  /**
   * - `string` / `number` / `boolean` — single scalar inputs
   * - `stringMap` — key/value row editor for string→string maps (e.g. `codeLabels`),
   *   with an optional List / JSON view toggle in `TransformOptionsEditor`
   * - `json` — validated JSON textarea for plain objects (advanced / free-form);
   *   drafts commit when parseable and pretty-print on blur
   */
  readonly kind: 'string' | 'number' | 'boolean' | 'stringMap' | 'json';
}

export interface ValueTransformDefinition {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly category?: string;
  readonly inputTypes?: readonly FieldDataType[];
  readonly outputType?: FieldDataType;
  /**
   * May return a Promise (e.g. host JSONata 2.x). Prefer `applyTransformChain` /
   * `convertToShape`, which always await transform results.
   */
  readonly apply: (value: unknown, context: TransformContext) => unknown | PromiseLike<unknown>;
  /** Optional picker label that includes a live format sample. */
  readonly formatSampleLabel?: (context: TransformContext) => string;
  /**
   * Data-driven option editors (mapped rows / convert panel).
   * Values are stored per step (`transformOptionSteps` / `itemTransformOptionSteps`)
   * or as a shared bag (`transformOptions` / `itemTransformOptions`), or on host
   * `TransformContext.options`.
   */
  readonly optionFields?: readonly TransformOptionField[];
}

export interface ValueTransformListFilter {
  readonly inputType?: FieldDataType;
  readonly category?: string;
}

export interface ValueTransformRegistry {
  list(filter?: ValueTransformListFilter): ValueTransformDefinition[];
  get(id: string): ValueTransformDefinition | undefined;
  apply(id: string, value: unknown, context?: TransformContext): unknown | PromiseLike<unknown>;
  register(definition: ValueTransformDefinition): void;
}
