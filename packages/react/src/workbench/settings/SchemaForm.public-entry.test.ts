import { describe, expect, it } from 'vitest';

import * as focusedSchemaForm from './SchemaForm';
import * as legacySettings from './index';
import * as legacyWorkbench from '../index';

const runtimeExportNames = [
  'WorkbenchSchemaForm',
  'coerceWorkbenchSchemaFormFieldValue',
  'getWorkbenchSchemaFormErrors',
  'getWorkbenchSchemaFormFieldDefaultValue',
  'getWorkbenchSchemaFormFieldError',
  'isWorkbenchSchemaFormSubmittable',
  'normalizeWorkbenchSchemaFormValues',
] as const;

describe('SchemaForm public entry identity', () => {
  it('keeps the focused runtime surface exact', () => {
    expect(Object.keys(focusedSchemaForm).sort()).toEqual([...runtimeExportNames].sort());
  });

  it.each(runtimeExportNames)('shares %s with the legacy barrels', (exportName) => {
    expect(legacySettings[exportName]).toBe(focusedSchemaForm[exportName]);
    expect(legacyWorkbench[exportName]).toBe(focusedSchemaForm[exportName]);
  });
});
