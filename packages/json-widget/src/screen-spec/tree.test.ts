import { describe, expect, it } from 'vitest';

import { screenColumn, screenText } from './builders.js';
import { getScreenNodeAt, listScreenSpecOutline, updateScreenNodeAt } from './tree.js';
import type { JdwScreenSpec } from './types.js';

const spec: JdwScreenSpec = {
  id: 'demo',
  title: 'Demo',
  description: 'Demo screen',
  frameWidth: 320,
  layout: { maxWidth: 320, maxHeight: 200 },
  root: screenColumn(
    [screenText('Hello'), screenText('World', { color: '#fff' })],
    { gap: 8 },
  ),
};

describe('screen-spec tree', () => {
  it('lists outline entries depth-first', () => {
    const outline = listScreenSpecOutline(spec);
    expect(outline.map((entry) => entry.label)).toEqual([
      'column (2 children)',
      'text: Hello',
      'text: World',
    ]);
  });

  it('updates a nested text node by path', () => {
    const updated = updateScreenNodeAt(spec, [1], screenText('Updated', { color: '#fff' }));
    expect(getScreenNodeAt(updated.root, [1])).toEqual({
      kind: 'text',
      content: 'Updated',
      style: { color: '#fff' },
    });
  });
});
