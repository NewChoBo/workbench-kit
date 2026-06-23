import { describe, expect, it } from 'vitest';

import {
  collectJsonWidgetChangedValuePaths,
  collectJsonWidgetInvalidations,
  collectJsonWidgetListenBindings,
  collectJsonWidgetValueDependencies,
  formatJsonWidgetData,
  genericWidgetToJdwNode,
  isJsonWidgetDynamicValueExpression,
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
  resolveJsonWidgetValues,
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
      flexFit: 'tight',
    });
  });

  it('preserves flexible loose fit as linear placement metadata', () => {
    const widget = jdwNodeToGenericWidget({
      type: 'flexible',
      args: {
        flex: 2,
        fit: 'loose',
        child: { type: 'text', args: { text: 'Loose', width: 20 } },
      },
    });

    expect(widget).toEqual({
      type: 'text',
      text: 'Loose',
      width: 20,
      flex: 2,
      flexFit: 'loose',
    });

    expect(genericWidgetToJdwNode(widget)).toEqual({
      type: 'flexible',
      args: {
        flex: 2,
        fit: 'loose',
        child: { type: 'text', args: { text: 'Loose', width: 20 } },
      },
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

  it('resolves exact variable expressions with original value types', () => {
    const node = resolveJsonWidgetValues(
      {
        type: 'text',
        args: {
          text: '${title}',
          fontSize: '${font.size}',
        },
      },
      {
        title: 'Resolved title',
        font: { size: 24 },
      },
    );

    expect(node.args).toEqual({
      text: 'Resolved title',
      fontSize: 24,
    });
  });

  it('identifies exact dynamic value expressions', () => {
    expect(isJsonWidgetDynamicValueExpression('${theme.spacing}')).toBe(true);
    expect(isJsonWidgetDynamicValueExpression('Size ${theme.spacing}')).toBe(false);
    expect(isJsonWidgetDynamicValueExpression('${theme.spacing}px')).toBe(false);
  });

  it('resolves template variable expressions inside strings', () => {
    const node = resolveJsonWidgetValues(
      {
        type: 'text',
        args: {
          text: 'Hello ${user.name}',
          color: '${missing}',
        },
      },
      {
        user: { name: 'JDW' },
      },
    );

    expect(node.args.text).toBe('Hello JDW');
    expect(node.args.color).toBe('${missing}');
  });

  it('collects dynamic value dependencies across the widget tree', () => {
    expect(
      collectJsonWidgetValueDependencies({
        type: 'column',
        args: {
          gap: '${layout.spacing}',
          metadata: { label: 'Hello ${user.name}' },
          children: [
            {
              type: 'text',
              args: {
                text: '${title}',
                color: '${theme.color}',
              },
            },
          ],
        },
      }),
    ).toEqual(['layout.spacing', 'user.name', 'title', 'theme.color']);
  });

  it('summarizes node-local listen bindings for dynamic args', () => {
    expect(
      collectJsonWidgetListenBindings({
        type: 'column',
        listen: ['layout.spacing', 'unused'],
        args: {
          gap: '${layout.spacing}',
          children: [
            {
              type: 'text',
              listen: ['title'],
              args: {
                text: 'Hello ${title}',
                fontSize: '${fontSize}',
              },
            },
          ],
        },
      }),
    ).toEqual([
      {
        widgetPath: [],
        nodePath: 'root',
        type: 'column',
        listen: ['layout.spacing', 'unused'],
        dependencies: ['layout.spacing'],
        missingListen: [],
        unusedListen: ['unused'],
      },
      {
        widgetPath: [{ kind: 'children', index: 0 }],
        nodePath: 'root.args.children[0]',
        type: 'text',
        listen: ['title'],
        dependencies: ['title', 'fontSize'],
        missingListen: ['fontSize'],
        unusedListen: [],
      },
    ]);
  });

  it('collects listen-driven invalidation candidates for changed value paths', () => {
    expect(
      collectJsonWidgetInvalidations(
        {
          type: 'column',
          listen: ['layout'],
          args: {
            gap: '${layout.spacing}',
            children: [
              {
                type: 'text',
                listen: ['title', 'theme.color'],
                args: {
                  text: '${title}',
                  color: '${theme.color}',
                },
              },
              {
                type: 'button',
                args: {
                  label: '${title}',
                },
              },
            ],
          },
        },
        ['layout.spacing', 'theme'],
      ),
    ).toEqual([
      {
        widgetPath: [],
        nodePath: 'root',
        type: 'column',
        listen: ['layout'],
        changedListen: ['layout'],
        changedPaths: ['layout.spacing', 'theme'],
      },
      {
        widgetPath: [{ kind: 'children', index: 0 }],
        nodePath: 'root.args.children[0]',
        type: 'text',
        listen: ['title', 'theme.color'],
        changedListen: ['theme.color'],
        changedPaths: ['layout.spacing', 'theme'],
      },
    ]);
  });

  it('collects changed value paths for immutable runtime value updates', () => {
    const changedPaths = collectJsonWidgetChangedValuePaths(
      {
        title: 'Old title',
        theme: { color: 'red', spacing: 8 },
        stale: true,
      },
      {
        title: 'New title',
        theme: { color: 'blue', spacing: 8 },
        added: { enabled: true },
      },
    );

    expect(changedPaths).toEqual(['title', 'theme.color', 'stale', 'added']);
    expect(
      collectJsonWidgetInvalidations(
        {
          type: 'column',
          listen: ['theme'],
          args: {
            gap: '${theme.spacing}',
            children: [
              {
                type: 'text',
                listen: ['title'],
                args: { text: '${title}' },
              },
            ],
          },
        },
        changedPaths,
      ),
    ).toMatchObject([
      {
        nodePath: 'root',
        changedListen: ['theme'],
      },
      {
        nodePath: 'root.args.children[0]',
        changedListen: ['title'],
      },
    ]);
  });
});
