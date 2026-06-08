import { describe, expect, it } from 'vitest';

import { formatWidgetJson, parseWidgetJson } from './parse-widget-json.js';

describe('parseWidgetJson', () => {
  it('parses widget JSON and preserves parse error messages', () => {
    expect(parseWidgetJson('{"type":"text","text":"Hello"}')).toMatchObject({
      parseError: null,
      value: {
        type: 'text',
        text: 'Hello',
      },
    });

    const parseErrorResult = parseWidgetJson('{');
    expect(parseErrorResult.value).toBeNull();
    expect(parseErrorResult.parseError).toMatch(/JSON|token|property name/i);
  });

  it('normalizes object-only JSON and rejects empty/non-object roots', () => {
    expect(parseWidgetJson('   ').parseError).toBe('JSON is empty.');
    expect(parseWidgetJson('null').parseError).toBe('Root must be a JSON object.');
    expect(parseWidgetJson('[]').parseError).toBe('Root must be a JSON object.');
  });
});

describe('formatWidgetJson', () => {
  it('serializes widget data with stable pretty JSON formatting', () => {
    expect(formatWidgetJson({ type: 'text', text: 'Hello', id: 'title' })).toBe(
      '{\n  "type": "text",\n  "text": "Hello",\n  "id": "title"\n}',
    );
  });
});
