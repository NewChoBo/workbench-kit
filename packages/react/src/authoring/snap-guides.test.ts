import { describe, expect, it } from 'vitest';

import { snapDelta, snapScalar } from './snap-guides.js';

describe('snap-guides', () => {
  it('snaps a scalar to the nearest guide within threshold', () => {
    expect(snapScalar(103, [0, 100, 200], 8)).toBe(100);
    expect(snapScalar(50, [0, 100, 200], 8)).toBe(50);
  });

  it('snaps drag delta against guide lines', () => {
    const delta = snapDelta({ x: 7, y: 10 }, { x: 93, y: 40 }, [0, 100, 200], [0, 50, 100]);
    expect(delta.x).toBe(7);
    expect(delta.y).toBe(10);
  });
});
