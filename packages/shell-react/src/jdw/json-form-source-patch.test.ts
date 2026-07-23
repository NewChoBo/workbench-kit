import { describe, expect, it } from 'vitest';

import { findJsonValueRangeAtPath, replaceJsonValueAtPath } from './json-form-source-patch.js';

const WIDGET_JSON = JSON.stringify(
  {
    type: 'text',
    args: {
      text: 'Preview title',
    },
  },
  null,
  2,
);

describe('replaceJsonValueAtPath', () => {
  it('replaces a nested field without reformatting the document', () => {
    const next = replaceJsonValueAtPath(WIDGET_JSON, ['args', 'text'], 'Updated title');

    expect(next).toContain('"text": "Updated title"');
    expect(next).not.toContain('"text": "Preview title"');
    expect(next.split('\n').length).toBe(WIDGET_JSON.split('\n').length);
    expect(next.slice(0, next.indexOf('"args"'))).toBe(
      WIDGET_JSON.slice(0, WIDGET_JSON.indexOf('"args"')),
    );
  });

  it('replaces a top-level field in compact JSON', () => {
    const source = '{"type":"text","args":{"text":"A"}}';
    const next = replaceJsonValueAtPath(source, ['type'], 'image');

    expect(next).toBe('{"type":"image","args":{"text":"A"}}');
  });

  it('finds nested value ranges in pretty-printed JSON', () => {
    const range = findJsonValueRangeAtPath(WIDGET_JSON, ['args', 'text']);
    expect(range).not.toBeNull();
    expect(WIDGET_JSON.slice(range!.start, range!.end)).toBe('"Preview title"');
  });
});
