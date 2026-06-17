import { describe, expect, it } from 'vitest';

import { validateJsonWidgetData } from '../validate-json-widget-data.js';
import { screenText } from './builders.js';
import { compileScreenSpecText, parseScreenSpecJson } from './parse.js';
import type { JdwScreenSpec } from './types.js';

const minimalSpec: JdwScreenSpec = {
  id: 'demo',
  title: 'Demo',
  description: 'Demo',
  frameWidth: 320,
  layout: { maxWidth: 320, maxHeight: 200 },
  root: screenText('Hello'),
};

describe('parseScreenSpecJson', () => {
  it('parses and compiles a valid screen spec', () => {
    const source = `${JSON.stringify(minimalSpec, null, 2)}\n`;
    const parsed = parseScreenSpecJson(source);
    expect(parsed.error).toBeNull();
    expect(parsed.value?.id).toBe('demo');

    const compiled = compileScreenSpecText(source);
    expect(compiled.error).toBeNull();
    expect(compiled.json).toContain('"text": "Hello"');
    expect(validateJsonWidgetData(compiled.json ?? '').valid).toBe(true);
  });

  it('returns an error for invalid JSON', () => {
    const parsed = parseScreenSpecJson('{');
    expect(parsed.value).toBeNull();
    expect(parsed.error).not.toBeNull();
  });

  it('returns an error when root kind is missing', () => {
    const parsed = parseScreenSpecJson(
      JSON.stringify({
        ...minimalSpec,
        root: { content: 'Hello' },
      }),
    );
    expect(parsed.value).toBeNull();
    expect(parsed.error).toContain('kind');
  });
});
