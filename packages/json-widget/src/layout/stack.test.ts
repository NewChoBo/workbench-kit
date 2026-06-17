import { describe, expect, it } from 'vitest';

import { computeStackChildRect } from './stack.js';

describe('computeStackChildRect', () => {
  it('fills remaining space when right and bottom are omitted', () => {
    expect(computeStackChildRect({ left: 20, top: 10 }, 200, 100)).toEqual({
      x: 20,
      y: 10,
      width: 180,
      height: 90,
    });
  });

  it('subtracts opposing edges when right and bottom are set', () => {
    expect(computeStackChildRect({ left: 20, top: 10, right: 30, bottom: 15 }, 200, 100)).toEqual({
      x: 20,
      y: 10,
      width: 150,
      height: 75,
    });
  });
});
