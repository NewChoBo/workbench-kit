import { describe, expect, it } from 'vitest';

import { resolveWidgetTreeModeShortcut } from './WidgetTreeModeControls.js';

describe('resolveWidgetTreeModeShortcut', () => {
  it('maps Ctrl/Cmd+1 to design and Ctrl/Cmd+2 to code', () => {
    expect(
      resolveWidgetTreeModeShortcut({
        key: '1',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      }),
    ).toBe('design');
    expect(
      resolveWidgetTreeModeShortcut({
        key: '2',
        ctrlKey: false,
        metaKey: true,
        altKey: false,
        shiftKey: false,
      }),
    ).toBe('code');
  });

  it('ignores plain keys and modified chords', () => {
    expect(
      resolveWidgetTreeModeShortcut({
        key: '1',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      }),
    ).toBeNull();
    expect(
      resolveWidgetTreeModeShortcut({
        key: '1',
        ctrlKey: true,
        metaKey: false,
        altKey: true,
        shiftKey: false,
      }),
    ).toBeNull();
    expect(
      resolveWidgetTreeModeShortcut({
        key: '2',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true,
      }),
    ).toBeNull();
  });
});
