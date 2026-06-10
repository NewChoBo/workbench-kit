import { describe, expect, it } from 'vitest';

import { formatJsonWidgetData } from './jdw-node.js';
import { validateJsonWidgetData } from './validate-json-widget-data.js';

describe('validateJsonWidgetData', () => {
  it('accepts a valid column document', () => {
    const source = formatJsonWidgetData({
      type: 'column',
      args: {
        gap: 12,
        children: [
          { type: 'text', args: { text: 'Hello' } },
          {
            type: 'row',
            args: {
              children: [
                {
                  type: 'expanded',
                  args: {
                    flex: 1,
                    child: { type: 'text', args: { text: 'A' } },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    const result = validateJsonWidgetData(source, { strictKnownTypes: true });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reports missing grid columns', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'grid',
        args: { children: [] },
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes('columns'))).toBe(true);
  });

  it('reports unknown types in strict mode', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'scaffold',
        args: {},
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toContain('Unknown widget type');
  });

  it('allows registered custom types in strict mode', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'hero-banner',
        args: { title: 'Hello' },
      }),
      { strictKnownTypes: true, registeredTypes: ['hero-banner'] },
    );

    expect(result.valid).toBe(true);
  });
});
