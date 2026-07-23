import { describe, expect, it } from 'vitest';

import type { WidgetPlacementAsset } from '@workbench-kit/contracts';

import { layoutWidget } from '../layout/layout-widget.js';
import { materializeWidgetPlacementAsset } from './placement-asset.js';
import { mergeWidgetAssetInputs, resolveWidgetAssetContent } from './asset-inputs.js';

const parameterizedHeading: WidgetPlacementAsset = {
  id: 'content.heading',
  label: 'Heading',
  category: 'content',
  kind: 'leaf',
  content: {
    type: 'text',
    text: '${title}',
    fontSize: '${fontSize}',
  } as WidgetPlacementAsset['content'],
  inputsSchema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
      fontSize: { type: 'number', default: 24 },
    },
  },
};

describe('resolveWidgetAssetContent', () => {
  it('merges schema defaults and resolves dynamic content expressions', () => {
    const resolved = resolveWidgetAssetContent(parameterizedHeading, { title: 'Welcome' });

    expect(resolved.valid).toBe(true);
    expect(resolved.inputs).toEqual({ title: 'Welcome', fontSize: 24 });
    expect(resolved.widget).toMatchObject({
      type: 'text',
      text: 'Welcome',
      fontSize: 24,
    });
  });

  it('reports missing required inputs', () => {
    const resolved = resolveWidgetAssetContent(parameterizedHeading, {});

    expect(resolved.valid).toBe(false);
    expect(resolved.widget).toBeNull();
    expect(resolved.issues).toEqual([
      {
        path: 'inputs.title',
        message: '"title" is required by the asset schema.',
      },
    ]);
  });

  it('reports basic input type mismatches', () => {
    const merged = mergeWidgetAssetInputs(parameterizedHeading, {
      title: 'Ok',
      fontSize: 'large',
    });

    expect(merged.valid).toBe(false);
    expect(merged.issues.some((issue) => issue.path === 'inputs.fontSize')).toBe(true);
  });

  it('materializes resolved content into a parent with layout-ready placement', () => {
    const parent = {
      type: 'grid',
      columns: 2,
      children: [{ type: 'text', text: 'A', col: 0, row: 0 }],
    };

    const widget = materializeWidgetPlacementAsset(parameterizedHeading, parent, {
      inputs: { title: 'Body', fontSize: 18 },
    });

    expect(widget).toMatchObject({
      type: 'text',
      text: 'Body',
      fontSize: 18,
      col: 1,
      row: 0,
    });

    const layout = layoutWidget(
      {
        type: 'grid',
        columns: 2,
        children: [parent.children[0]!, widget],
      },
      { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 100 },
    );
    expect(layout.children).toHaveLength(2);
    expect(layout.children[1]?.widget).toMatchObject({ text: 'Body', fontSize: 18 });
  });
});
