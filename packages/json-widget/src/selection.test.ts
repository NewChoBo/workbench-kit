import { describe, expect, it } from 'vitest';

import { ROOT_WIDGET_PATH, widgetPathKey } from './path.js';
import {
  emptyWidgetSelection,
  selectWidgetPath,
  selectWidgetPathWithOptions,
  selectedWidgetPaths,
} from './selection.js';

const childPathA = [...ROOT_WIDGET_PATH, { kind: 'children' as const, index: 0 }];
const childPathB = [...ROOT_WIDGET_PATH, { kind: 'children' as const, index: 1 }];

describe('widget selection', () => {
  it('replaces selection on plain select', () => {
    const state = selectWidgetPath(emptyWidgetSelection(), childPathA);
    const next = selectWidgetPathWithOptions(state, childPathB);
    expect([...next.pathKeys]).toEqual([widgetPathKey(childPathB)]);
    expect(selectedWidgetPaths(next)).toEqual([childPathB]);
  });

  it('toggles paths when additive (shift) select', () => {
    const first = selectWidgetPathWithOptions(emptyWidgetSelection(), childPathA);
    const both = selectWidgetPathWithOptions(first, childPathB, { additive: true });
    expect(both.pathKeys.size).toBe(2);

    const removed = selectWidgetPathWithOptions(both, childPathA, { additive: true });
    expect([...removed.pathKeys]).toEqual(['$.children[1]']);
  });
});
