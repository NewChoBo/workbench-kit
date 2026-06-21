import { describe, expect, it } from 'vitest';

import {
  createEditorGroupDropMoveOptions,
  resolveEditorGroupDropSide,
  type EditorDropRect,
} from './editor-layout.js';

const SAMPLE_RECT: EditorDropRect = {
  bottom: 480,
  height: 480,
  left: 0,
  right: 360,
  top: 0,
  width: 360,
};

describe('editor layout drop helpers', () => {
  it('resolves group drop side from plain geometry', () => {
    expect(resolveEditorGroupDropSide({ point: { x: 180, y: 240 }, rect: SAMPLE_RECT })).toBe(
      'center',
    );
    expect(resolveEditorGroupDropSide({ point: { x: 8, y: 240 }, rect: SAMPLE_RECT })).toBe('left');
    expect(resolveEditorGroupDropSide({ point: { x: 352, y: 240 }, rect: SAMPLE_RECT })).toBe(
      'right',
    );
    expect(resolveEditorGroupDropSide({ point: { x: 180, y: 8 }, rect: SAMPLE_RECT })).toBe('top');
    expect(resolveEditorGroupDropSide({ point: { x: 180, y: 472 }, rect: SAMPLE_RECT })).toBe(
      'bottom',
    );
  });

  it('chooses the nearest edge when pointer is in multiple edge zones', () => {
    expect(resolveEditorGroupDropSide({ point: { x: 340, y: 60 }, rect: SAMPLE_RECT })).toBe(
      'right',
    );
    expect(resolveEditorGroupDropSide({ point: { x: 40, y: 8 }, rect: SAMPLE_RECT })).toBe('top');
  });

  it('maps group drop sides to editor move options', () => {
    expect(
      createEditorGroupDropMoveOptions({
        dropSide: 'center',
        groupId: 'group-a',
        tabId: 'tab-a',
      }),
    ).toEqual({ groupId: 'group-a', tabId: 'tab-a' });
    expect(
      createEditorGroupDropMoveOptions({
        dropSide: 'left',
        groupId: 'group-a',
        tabId: 'tab-a',
      }),
    ).toEqual({ beforeGroupId: 'group-a', direction: 'horizontal', tabId: 'tab-a' });
    expect(
      createEditorGroupDropMoveOptions({
        dropSide: 'right',
        groupId: 'group-a',
        tabId: 'tab-a',
      }),
    ).toEqual({ afterGroupId: 'group-a', direction: 'horizontal', tabId: 'tab-a' });
    expect(
      createEditorGroupDropMoveOptions({
        dropSide: 'top',
        groupId: 'group-a',
        tabId: 'tab-a',
      }),
    ).toEqual({ beforeGroupId: 'group-a', direction: 'vertical', tabId: 'tab-a' });
    expect(
      createEditorGroupDropMoveOptions({
        dropSide: 'bottom',
        groupId: 'group-a',
        tabId: 'tab-a',
      }),
    ).toEqual({ afterGroupId: 'group-a', direction: 'vertical', tabId: 'tab-a' });
  });
});
