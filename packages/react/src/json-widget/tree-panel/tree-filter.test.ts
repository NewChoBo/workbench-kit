import { describe, expect, it } from 'vitest';
import { formatWidgetJson, parseWidgetJson, type GenericWidget } from '@workbench-kit/json-widget';

import { buildVisibleTreePathKeys } from './tree-filter.js';

describe('buildVisibleTreePathKeys', () => {
  const root = parseWidgetJson<GenericWidget>(
    formatWidgetJson({
      type: 'grid',
      columns: 2,
      children: [
        { type: 'text', text: 'Welcome', label: 'Hero', col: 0, row: 0 },
        { type: 'button', label: 'Launch', col: 1, row: 0 },
      ],
    }),
  ).value!;

  it('returns null when query is empty', () => {
    expect(buildVisibleTreePathKeys(root, '')).toBeNull();
    expect(buildVisibleTreePathKeys(root, '   ')).toBeNull();
  });

  it('includes matching nodes and ancestors', () => {
    const visible = buildVisibleTreePathKeys(root, 'launch');
    expect(visible).not.toBeNull();
    expect(visible?.size).toBeGreaterThan(0);
  });

  it('returns empty set when nothing matches', () => {
    const visible = buildVisibleTreePathKeys(root, 'zzzz-not-found');
    expect(visible?.size).toBe(0);
  });
});
