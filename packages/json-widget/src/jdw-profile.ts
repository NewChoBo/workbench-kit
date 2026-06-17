/** Workbench JSON Dynamic Widget profile identifier. */
export const WORKBENCH_JDW_PROFILE = 'workbench-jdw-react-v1';

/** Stock JDW layout/content types implemented in the React builtin registry. */
export const WORKBENCH_JDW_BUILTIN_TYPES = [
  'text',
  'row',
  'column',
  'expanded',
  'flexible',
] as const;

/** Kit extension types layered on top of the JDW profile. */
export const WORKBENCH_KIT_EXTENSION_TYPES = ['grid'] as const;

export const WORKBENCH_JDW_KNOWN_TYPES = [
  ...WORKBENCH_JDW_BUILTIN_TYPES,
  ...WORKBENCH_KIT_EXTENSION_TYPES,
] as const;

export type WorkbenchJdwKnownType = (typeof WORKBENCH_JDW_KNOWN_TYPES)[number];
