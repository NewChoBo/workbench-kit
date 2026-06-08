import { describe, expect, it } from 'vitest';

import {
  formatWidgetJson,
  getWidgetChildren,
  parseWidgetJson,
  type GenericWidget,
} from '@workbench-kit/json-widget';

import { WELCOME_PLAYGROUND_DOCUMENT } from './demo-playground-registry.js';
import { deletePlaygroundWidget, duplicatePlaygroundWidget } from './playground-ops.js';

describe('playground widget ops', () => {
  it('deletes the selected widget path', () => {
    const next = deletePlaygroundWidget(WELCOME_PLAYGROUND_DOCUMENT, [
      { kind: 'children', index: 0 },
    ]);
    expect(next).not.toBeNull();

    const parsed = parseWidgetJson<GenericWidget>(next!);
    expect(getWidgetChildren(parsed.value!)).toHaveLength(0);
  });

  it('does not delete the root widget', () => {
    expect(deletePlaygroundWidget(WELCOME_PLAYGROUND_DOCUMENT, [])).toBeNull();
  });

  it('duplicates the selected widget as a sibling', () => {
    const next = duplicatePlaygroundWidget(WELCOME_PLAYGROUND_DOCUMENT, [
      { kind: 'children', index: 0 },
    ]);
    expect(next).not.toBeNull();

    const parsed = parseWidgetJson<GenericWidget>(next!);
    const children = getWidgetChildren(parsed.value!);
    expect(children).toHaveLength(2);
    expect(children[0]).toMatchObject({ type: 'text', text: 'Welcome' });
    expect(children[1]).toMatchObject({ type: 'text', text: 'Welcome' });
  });

  it('returns null when duplicating the root widget', () => {
    expect(
      duplicatePlaygroundWidget(formatWidgetJson({ type: 'grid', columns: 1 }), []),
    ).toBeNull();
  });
});
