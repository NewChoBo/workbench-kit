/** Workbench JSON Dynamic Widget profile identifier. */
export const WORKBENCH_JDW_PROFILE = 'workbench-jdw-react-v1';

export type WorkbenchJdwSupportLevel = 'schema-only' | 'preview' | 'editable' | 'dynamic';

export type WorkbenchJdwTypeCategory = 'flutter-builtin' | 'kit-extension';

/** Stock JDW layout/content types tracked by the workbench JDW profile. */
export const WORKBENCH_JDW_BUILTIN_TYPES = [
  'text',
  'row',
  'column',
  'expanded',
  'flexible',
  'stack',
  'container',
  'padding',
  'align',
  'center',
  'sized_box',
  'image',
  'icon',
] as const;

/** Kit extension types layered on top of the JDW profile. */
export const WORKBENCH_KIT_EXTENSION_TYPES = ['grid', 'box', 'button'] as const;

export const WORKBENCH_JDW_KNOWN_TYPES = [
  ...WORKBENCH_JDW_BUILTIN_TYPES,
  ...WORKBENCH_KIT_EXTENSION_TYPES,
] as const;

export type WorkbenchJdwKnownType = (typeof WORKBENCH_JDW_KNOWN_TYPES)[number];

export interface WorkbenchJdwTypeSupport {
  readonly type: WorkbenchJdwKnownType;
  readonly category: WorkbenchJdwTypeCategory;
  readonly level: WorkbenchJdwSupportLevel;
  readonly notes?: string | undefined;
}

export const WORKBENCH_JDW_TYPE_SUPPORT = [
  {
    type: 'text',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Text content and basic style fields have preview and inspector coverage.',
  },
  {
    type: 'row',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Linear container preview and common layout fields are editable.',
  },
  {
    type: 'column',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Linear container preview and common layout fields are editable.',
  },
  {
    type: 'expanded',
    category: 'flutter-builtin',
    level: 'preview',
    notes: 'Parsed as child flex placement and represented in layout preview.',
  },
  {
    type: 'flexible',
    category: 'flutter-builtin',
    level: 'preview',
    notes: 'Parsed as child flex placement; tight and loose fit affect layout preview.',
  },
  {
    type: 'stack',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Stack layout, preview, background, and child inset metadata are available.',
  },
  {
    type: 'container',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Single-child wrapper preview and inspector support size, padding, and background.',
  },
  {
    type: 'padding',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Single-child wrapper preview and inspector support static padding.',
  },
  {
    type: 'align',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Single-child wrapper preview and inspector support static alignment.',
  },
  {
    type: 'center',
    category: 'flutter-builtin',
    level: 'preview',
    notes: 'Single-child wrapper preview centers children with size hints.',
  },
  {
    type: 'sized_box',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Single-child wrapper preview and inspector support static width and height.',
  },
  {
    type: 'image',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Static image preview supports safe source strings, alt text, fit, and size metadata.',
  },
  {
    type: 'icon',
    category: 'flutter-builtin',
    level: 'editable',
    notes: 'Static icon preview supports codicon-compatible names, color, and size metadata.',
  },
  {
    type: 'grid',
    category: 'kit-extension',
    level: 'editable',
    notes: 'Workbench Kit extension with schema, preview, and inspector coverage.',
  },
  {
    type: 'box',
    category: 'kit-extension',
    level: 'editable',
    notes: 'Kit single-child wrapper with size, padding, and background metadata.',
  },
  {
    type: 'button',
    category: 'kit-extension',
    level: 'editable',
    notes: 'Static button-like preview with label, variant, disabled, and style metadata.',
  },
] as const satisfies readonly WorkbenchJdwTypeSupport[];

export function getWorkbenchJdwTypeSupport(type: string): WorkbenchJdwTypeSupport | undefined {
  return WORKBENCH_JDW_TYPE_SUPPORT.find((entry) => entry.type === type);
}

export function listWorkbenchJdwTypesBySupportLevel(
  level: WorkbenchJdwSupportLevel,
): readonly WorkbenchJdwTypeSupport[] {
  return WORKBENCH_JDW_TYPE_SUPPORT.filter((entry) => entry.level === level);
}
