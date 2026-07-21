import { describe, expect, it } from 'vitest';

import {
  createEditorLayoutForInsertedGroup,
  createEditorGroupDropMoveOptions,
  isSameEditorLayout,
  normalizeEditorLayoutWithGroups,
  normalizeEditorSplitPrimarySizePercent,
  resolveEditorGroupDropSide,
  type EditorDropRect,
} from './editor-layout.js';
import type { EditorGroupState, EditorLayoutNode } from './editor-service.js';

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

describe('editor layout tree helpers', () => {
  const mainGroup: EditorGroupState = { id: 'group-main', tabs: [] };
  const sideGroup: EditorGroupState = { id: 'group-side', tabs: [] };
  const rightGroup: EditorGroupState = { id: 'group-right', tabs: [] };

  it('creates nested split layout when insertion direction differs from the anchor split', () => {
    const layout: EditorLayoutNode = {
      children: [
        { groupId: mainGroup.id, type: 'group' },
        { groupId: rightGroup.id, type: 'group' },
      ],
      direction: 'horizontal',
      type: 'split',
    };

    expect(
      createEditorLayoutForInsertedGroup(layout, [mainGroup, sideGroup, rightGroup], {
        anchorGroupId: mainGroup.id,
        before: false,
        direction: 'vertical',
        groupId: sideGroup.id,
      }),
    ).toEqual({
      children: [
        {
          children: [
            { groupId: mainGroup.id, type: 'group' },
            { groupId: sideGroup.id, type: 'group' },
          ],
          direction: 'vertical',
          type: 'split',
        },
        { groupId: rightGroup.id, type: 'group' },
      ],
      direction: 'horizontal',
      type: 'split',
    });
  });

  it('normalizes stale layout nodes and appends missing groups', () => {
    const layout: EditorLayoutNode = {
      children: [
        { groupId: 'stale', type: 'group' },
        { groupId: mainGroup.id, type: 'group' },
        { groupId: mainGroup.id, type: 'group' },
      ],
      direction: 'horizontal',
      primarySizePercent: 42,
      type: 'split',
    };

    expect(normalizeEditorLayoutWithGroups(layout, [mainGroup, sideGroup])).toEqual({
      children: [
        { groupId: mainGroup.id, type: 'group' },
        { groupId: sideGroup.id, type: 'group' },
      ],
      direction: 'horizontal',
      type: 'split',
    });
  });

  it('compares layout trees and clamps split primary size', () => {
    const layout: EditorLayoutNode = {
      children: [
        { groupId: mainGroup.id, type: 'group' },
        { groupId: sideGroup.id, type: 'group' },
      ],
      direction: 'horizontal',
      primarySizePercent: 33,
      type: 'split',
    };

    expect(isSameEditorLayout(layout, { ...layout, children: [...layout.children] })).toBe(true);
    expect(isSameEditorLayout(layout, { ...layout, primarySizePercent: 34 })).toBe(false);
    expect(normalizeEditorSplitPrimarySizePercent(Number.NaN)).toBe(50);
    expect(normalizeEditorSplitPrimarySizePercent(2)).toBe(5);
    expect(normalizeEditorSplitPrimarySizePercent(98)).toBe(95);
  });
});
