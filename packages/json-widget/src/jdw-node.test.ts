import { describe, expect, it } from 'vitest';

import {
  formatJsonWidgetData,
  genericWidgetToJdwNode,
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
} from './jdw-node.js';

describe('jdw-node', () => {
  it('parses JDW v7 envelope nodes', () => {
    const parsed = parseJsonWidgetData(
      JSON.stringify({
        $schema: '../schemas/widget-document.v1.jdw.schema.json',
        type: 'column',
        args: {
          gap: 12,
          children: [{ type: 'text', args: { text: 'Hi' } }],
        },
      }),
    );

    expect(parsed.parseError).toBeNull();
    expect(parsed.value?.type).toBe('column');
    expect(jdwNodeToGenericWidget(parsed.value!)).toEqual({
      type: 'column',
      gap: 12,
      children: [{ type: 'text', text: 'Hi' }],
    });
  });

  it('rejects flat top-level widgets without args', () => {
    const parsed = parseJsonWidgetData(JSON.stringify({ type: 'text', text: 'Hi' }));
    expect(parsed.parseError).toContain('JDW v7 envelope');
  });

  it('round-trips expanded children to flat flex', () => {
    const node = genericWidgetToJdwNode({
      type: 'text',
      text: 'A',
      flex: 1,
    });

    expect(node).toEqual({
      type: 'expanded',
      args: {
        flex: 1,
        child: { type: 'text', args: { text: 'A' } },
      },
    });

    expect(jdwNodeToGenericWidget(node)).toEqual({
      type: 'text',
      text: 'A',
      flex: 1,
    });
  });

  it('formats nodes as JSON text', () => {
    expect(
      formatJsonWidgetData({
        type: 'text',
        args: { text: 'Hi' },
      }),
    ).toContain('"text": "Hi"');
  });
});
