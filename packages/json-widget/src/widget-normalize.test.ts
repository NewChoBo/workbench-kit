import { describe, expect, it } from 'vitest';

import {
  assignGridSlot,
  normalizeWidgetForParent,
  normalizeWidgetForPlacementPolicy,
  resolvePlacementPolicy,
  stripExternalPlacement,
} from './widget-normalize.js';
import { materializeWidgetPlacementAsset } from './widget-placement-asset.js';
import { getWidgetChildren, type GenericWidget } from './widget-tree.js';

describe('widget normalize', () => {
  it('strips grid placement when inserting into a row parent', () => {
    const child: GenericWidget = {
      type: 'text',
      text: 'A',
      col: 1,
      row: 0,
      flex: 2,
    };

    expect(stripExternalPlacement(child, 'row')).toMatchObject({
      type: 'text',
      text: 'A',
      flex: 2,
    });
    expect(stripExternalPlacement(child, 'row')).not.toHaveProperty('col');
  });

  it('assigns the next grid slot for a new child', () => {
    const parent: GenericWidget = {
      type: 'grid',
      columns: 2,
      children: [{ type: 'text', text: 'A', col: 0, row: 0 }],
    };

    expect(assignGridSlot(parent, { type: 'text', text: 'B' })).toMatchObject({
      col: 1,
      row: 0,
    });
  });

  it('preserves template internals while placing the root into a grid', () => {
    const parent: GenericWidget = {
      type: 'grid',
      columns: 2,
      children: [],
    };
    const template: GenericWidget = {
      type: 'column',
      children: [
        {
          type: 'text',
          text: 'Title',
          col: 9,
          row: 9,
        },
      ],
    };

    const placed = normalizeWidgetForPlacementPolicy(template, parent, 'preserve-internal-layout');
    expect(placed).toMatchObject({ type: 'column', col: 0, row: 0 });
    expect(getWidgetChildren(placed)[0]).toMatchObject({
      type: 'text',
      text: 'Title',
      col: 9,
      row: 9,
    });
  });

  it('derives placement policy defaults from asset kind', () => {
    expect(resolvePlacementPolicy(undefined, 'template')).toBe('preserve-internal-layout');
    expect(resolvePlacementPolicy(undefined, 'container')).toBe('preserve-internal-layout');
    expect(resolvePlacementPolicy(undefined, 'leaf')).toBe('rematerialize-grid-slot');
  });
});

describe('materializeWidgetPlacementAsset', () => {
  it('materializes a leaf into a grid with slot placement', () => {
    const parent: GenericWidget = {
      type: 'grid',
      columns: 2,
      children: [{ type: 'text', text: 'A', col: 0, row: 0 }],
    };

    const widget = materializeWidgetPlacementAsset(
      {
        id: 'content.body',
        label: 'Body',
        category: 'content',
        kind: 'leaf',
        widgetType: 'text',
        defaultWidget: { type: 'text', text: 'Body' } as never,
      },
      parent,
    );

    expect(widget).toMatchObject({ type: 'text', text: 'Body', col: 1, row: 0 });
  });

  it('normalizes direct inserts through the patch layer', () => {
    const parent: GenericWidget = {
      type: 'row',
      children: [],
    };

    const child = normalizeWidgetForParent({ type: 'text', text: 'A', col: 2, row: 1 }, parent);

    expect(child).toMatchObject({ type: 'text', text: 'A' });
    expect(child).not.toHaveProperty('col');
  });
});
