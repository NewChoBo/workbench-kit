import { describe, expect, it } from 'vitest';

import {
  formatWidgetJson,
  getWidgetChildren,
  parseWidgetJson,
  ROOT_WIDGET_PATH,
  type GenericWidget,
} from '@workbench-kit/json-widget';

import {
  EMPTY_PLAYGROUND_DOCUMENT,
  PLAYGROUND_WIDGET_TEMPLATES,
} from './demo-playground-registry.js';
import { insertPlaygroundWidget, resolveInsertTarget } from './playground-insert.js';

describe('playground insert helpers', () => {
  it('inserts a text widget at the root grid by default', () => {
    const next = insertPlaygroundWidget(
      EMPTY_PLAYGROUND_DOCUMENT,
      PLAYGROUND_WIDGET_TEMPLATES[0]!,
      null,
    );
    expect(next).not.toBeNull();

    const parsed = parseWidgetJson<GenericWidget>(next!);
    expect(parsed.parseError).toBeNull();
    expect(getWidgetChildren(parsed.value!)).toHaveLength(1);
    expect(getWidgetChildren(parsed.value!)[0]).toMatchObject({
      type: 'text',
      text: 'New text',
    });
  });

  it('inserts into a selected container path', () => {
    const document = formatWidgetJson({
      type: 'grid',
      columns: 2,
      children: [
        {
          type: 'stack',
          col: 0,
          row: 0,
          children: [{ type: 'text', text: 'existing', left: 0, top: 0 }],
        },
      ],
    });

    const target = resolveInsertTarget(parseWidgetJson<GenericWidget>(document).value!, [
      { kind: 'children', index: 0 },
    ]);

    expect(target).toEqual({
      parentPath: [{ kind: 'children', index: 0 }],
      index: 1,
    });

    const next = insertPlaygroundWidget(document, PLAYGROUND_WIDGET_TEMPLATES[0]!, [
      { kind: 'children', index: 0 },
    ]);
    const stack = getWidgetChildren(parseWidgetJson<GenericWidget>(next!).value!)[0];
    expect(getWidgetChildren(stack!)).toHaveLength(2);
  });

  it('falls back to root when selection is a leaf', () => {
    const root = parseWidgetJson<GenericWidget>(EMPTY_PLAYGROUND_DOCUMENT).value!;
    const target = resolveInsertTarget(root, [{ kind: 'children', index: 0 }]);
    expect(target.parentPath).toEqual(ROOT_WIDGET_PATH);
    expect(target.index).toBe(1);
  });
});
