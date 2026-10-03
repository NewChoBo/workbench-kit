import { describe, expect, it } from 'vitest';
import { resolveTreeDropPlacement } from './tree-drop-placement';

describe('shared tree drop geometry', () => {
  it('preserves container thirds, leaf halves and root inside-only behavior', () => {
    const at = (offsetY: number, canContain = true, insideOnly = false, height = 30) =>
      resolveTreeDropPlacement({ offsetY, canContain, insideOnly, height });
    expect([at(9), at(10), at(20), at(21)]).toEqual(['before', 'inside', 'inside', 'after']);
    expect([at(14, false), at(15, false)]).toEqual(['before', 'after']);
    expect([at(-100, true, true), at(100, true, true)]).toEqual(['inside', 'inside']);
    expect(at(0, false, false, 0)).toBe('before');
    expect(at(1, false, false, 0)).toBe('after');
  });
});
