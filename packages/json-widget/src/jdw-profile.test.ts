import { describe, expect, it } from 'vitest';

import {
  getWorkbenchJdwTypeSupport,
  listWorkbenchJdwTypesBySupportLevel,
  WORKBENCH_JDW_KNOWN_TYPES,
} from './jdw-profile.js';

describe('Workbench JDW profile', () => {
  it('tracks static Flutter-like builtins and kit extensions', () => {
    expect(WORKBENCH_JDW_KNOWN_TYPES).toContain('stack');
    expect(WORKBENCH_JDW_KNOWN_TYPES).toContain('sized_box');
    expect(WORKBENCH_JDW_KNOWN_TYPES).toContain('button');
  });

  it('exposes support metadata for authoring UI decisions', () => {
    expect(getWorkbenchJdwTypeSupport('image')?.level).toBe('editable');
    expect(getWorkbenchJdwTypeSupport('flexible')?.level).toBe('preview');
    expect(listWorkbenchJdwTypesBySupportLevel('schema-only').map((entry) => entry.type)).toEqual(
      [],
    );
  });
});
