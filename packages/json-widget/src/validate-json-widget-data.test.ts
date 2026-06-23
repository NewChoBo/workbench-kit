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

  it('accepts static wrapper and leaf builtins in strict mode', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'container',
        args: {
          width: 240,
          padding: 12,
          child: {
            type: 'stack',
            args: {
              children: [
                {
                  type: 'image',
                  args: {
                    src: 'asset://hero.png',
                    alt: 'Hero',
                    fit: 'cover',
                    width: 200,
                    height: 120,
                  },
                },
                {
                  type: 'button',
                  args: {
                    label: 'Open',
                    variant: 'primary',
                    disabled: false,
                  },
                },
              ],
            },
          },
        },
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects unsafe static image sources', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'image',
        args: { src: 'javascript:alert(1)' },
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'root.args.src')).toBe(true);
  });

  it('rejects unsupported flexible fit values', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'flexible',
        args: {
          flex: 1,
          fit: 'cover',
          child: { type: 'text', args: { text: 'A' } },
        },
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: 'root.args.fit',
      message: 'fit must be "tight" or "loose".',
    });
  });

  it('accepts unresolved exact dynamic expressions in scalar fields', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'column',
        listen: ['spacing', 'fontSize', 'disabled'],
        args: {
          gap: '${spacing}',
          padding: '${padding}',
          children: [
            {
              type: 'text',
              args: {
                text: 'Dynamic scalar document',
                fontSize: '${fontSize}',
              },
            },
            {
              type: 'flexible',
              args: {
                flex: '${flex}',
                fit: '${fit}',
                child: {
                  type: 'button',
                  args: {
                    label: 'Run',
                    disabled: '${disabled}',
                  },
                },
              },
            },
          ],
        },
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects template strings in numeric fields because they cannot preserve number types', () => {
    const result = validateJsonWidgetData(
      JSON.stringify({
        type: 'row',
        args: {
          gap: '${spacing}px',
          children: [],
        },
      }),
      { strictKnownTypes: true },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: 'root.args.gap',
      message: 'gap must be a finite number.',
    });
  });
});
