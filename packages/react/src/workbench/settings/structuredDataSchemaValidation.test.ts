import { describe, expect, it } from 'vitest';

import {
  buildWorkbenchStructuredDataSchemaSelectOptions,
  SCHEMA_FIELD_MAX_WARNING,
  SCHEMA_FIELD_MIN_WARNING,
  SCHEMA_FIELD_PATTERN_WARNING,
  shouldUseWorkbenchStructuredDataSchemaRadioControl,
  validateWorkbenchStructuredDataSchemaFieldValue,
} from './structuredDataSchemaValidation';

describe('validateWorkbenchStructuredDataSchemaFieldValue', () => {
  it('returns a warning when a string value does not match pattern', () => {
    expect(
      validateWorkbenchStructuredDataSchemaFieldValue(
        { pattern: '^[A-Z]{3}$', type: 'string' },
        'abc',
      ),
    ).toBe(SCHEMA_FIELD_PATTERN_WARNING);
  });

  it('accepts a string value that matches pattern', () => {
    expect(
      validateWorkbenchStructuredDataSchemaFieldValue(
        { pattern: '^[A-Z]{3}$', type: 'string' },
        'ABC',
      ),
    ).toBeUndefined();
  });

  it('validates numeric minimum and maximum bounds', () => {
    expect(
      validateWorkbenchStructuredDataSchemaFieldValue(
        { maximum: 10, minimum: 2, type: 'number' },
        1,
      ),
    ).toBe(SCHEMA_FIELD_MIN_WARNING);
    expect(
      validateWorkbenchStructuredDataSchemaFieldValue({ max: 10, min: 2, type: 'integer' }, 12),
    ).toBe(SCHEMA_FIELD_MAX_WARNING);
    expect(
      validateWorkbenchStructuredDataSchemaFieldValue(
        { maximum: 10, minimum: 2, type: 'number' },
        5,
      ),
    ).toBeUndefined();
  });
});

describe('buildWorkbenchStructuredDataSchemaSelectOptions', () => {
  it('builds labeled enum options from enumNames', () => {
    expect(
      buildWorkbenchStructuredDataSchemaSelectOptions({
        enum: ['draft', 'published'],
        enumNames: ['Draft', 'Published'],
      }),
    ).toEqual([
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ]);
  });

  it('builds options from oneOf const/title pairs', () => {
    expect(
      buildWorkbenchStructuredDataSchemaSelectOptions({
        oneOf: [
          { const: 'left', title: 'Left' },
          { const: 'right', title: 'Right' },
        ],
      }),
    ).toEqual([
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ]);
  });

  it('builds options from selectable ui.options', () => {
    expect(
      buildWorkbenchStructuredDataSchemaSelectOptions({
        selectable: true,
        ui: {
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
          ],
        },
      }),
    ).toEqual([
      { label: 'Primary', value: 'primary' },
      { label: 'Secondary', value: 'secondary' },
    ]);
  });
});

describe('shouldUseWorkbenchStructuredDataSchemaRadioControl', () => {
  it('uses radio for small enums and select for larger sets', () => {
    expect(
      shouldUseWorkbenchStructuredDataSchemaRadioControl({
        enum: ['a', 'b', 'c'],
      }),
    ).toBe(true);
    expect(
      shouldUseWorkbenchStructuredDataSchemaRadioControl({
        enum: ['a', 'b', 'c', 'd', 'e'],
      }),
    ).toBe(false);
    expect(
      shouldUseWorkbenchStructuredDataSchemaRadioControl({
        enum: ['a', 'b', 'c'],
        ui: { control: 'select' },
      }),
    ).toBe(false);
  });
});
