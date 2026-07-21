import { describe, expect, it } from 'vitest';
import {
  coerceWorkbenchStructuredDataSchemaDateValue,
  fromWorkbenchStructuredDataHtmlDateInputValue,
  inferWorkbenchStructuredDataSchemaDateFormat,
  parseWorkbenchStructuredDataSchemaDateValue,
  resolveWorkbenchStructuredDataSchemaDateFormat,
  toWorkbenchStructuredDataHtmlDateInputValue,
} from './structuredDataSchemaDate';
import {
  coerceWorkbenchStructuredDataSchemaFieldValue,
  stringifyWorkbenchStructuredDataSchemaFieldValue,
} from './structuredDataSchemaField';
import { validateWorkbenchStructuredDataSchemaFieldValue } from './structuredDataSchemaValidation';

const compactDateField = {
  type: 'string',
  format: 'date',
  pattern: '^\\d{8}$',
  ui: { control: 'date', dateFormat: 'yyyyMMdd' },
} as const;

const isoDateField = {
  type: 'string',
  format: 'date',
  ui: { control: 'date' },
} as const;

describe('structuredDataSchemaDate', () => {
  it('resolves per-field date formats from ui.dateFormat or pattern', () => {
    expect(resolveWorkbenchStructuredDataSchemaDateFormat(compactDateField)).toBe('yyyyMMdd');
    expect(resolveWorkbenchStructuredDataSchemaDateFormat(isoDateField)).toBe('yyyy-MM-dd');
    expect(
      inferWorkbenchStructuredDataSchemaDateFormat({
        pattern: '^\\d{8}$',
        type: 'string',
      }),
    ).toBe('yyyyMMdd');
  });

  it('converts compact stored values to HTML date input values', () => {
    expect(toWorkbenchStructuredDataHtmlDateInputValue('20260703', compactDateField)).toBe(
      '2026-07-03',
    );
    expect(stringifyWorkbenchStructuredDataSchemaFieldValue('20260703', compactDateField)).toBe(
      '2026-07-03',
    );
  });

  it('stores HTML date input values using the field dateFormat', () => {
    expect(fromWorkbenchStructuredDataHtmlDateInputValue('2026-07-03', compactDateField)).toBe(
      '20260703',
    );
    expect(coerceWorkbenchStructuredDataSchemaFieldValue('2026-07-03', compactDateField)).toBe(
      '20260703',
    );
    expect(coerceWorkbenchStructuredDataSchemaDateValue('2026-07-03', compactDateField)).toBe(
      '20260703',
    );
  });

  it('keeps ISO storage for default date fields', () => {
    expect(fromWorkbenchStructuredDataHtmlDateInputValue('2026-07-03', isoDateField)).toBe(
      '2026-07-03',
    );
  });

  it('parses known compact and ISO values for validation', () => {
    expect(parseWorkbenchStructuredDataSchemaDateValue('20260703', compactDateField)).toEqual({
      year: 2026,
      month: 7,
      day: 3,
    });
    expect(parseWorkbenchStructuredDataSchemaDateValue('2026-13-01', isoDateField)).toBeNull();
    expect(
      validateWorkbenchStructuredDataSchemaFieldValue(compactDateField, '20260703'),
    ).toBeUndefined();
    expect(validateWorkbenchStructuredDataSchemaFieldValue(compactDateField, '20261301')).toBe(
      'Value is not a valid date.',
    );
  });
});
