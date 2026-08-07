import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { SAMPLE_FIELD_REMAP_VIEW_HOST_FACTORY, SampleFieldRemapView } from './view.js';
import {
  isSampleFieldRemapViewRenderData,
  SAMPLE_FIELD_REMAP_VIEW_ID,
  SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND,
} from './view-data.js';
import { toWorkbenchViewHostReactNode } from '../shell/view-host.js';

describe('isSampleFieldRemapViewRenderData', () => {
  it('accepts the sample schema mapper render kind', () => {
    expect(
      isSampleFieldRemapViewRenderData({
        kind: SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND,
      }),
    ).toBe(true);
  });

  it('rejects unrelated render payloads', () => {
    expect(
      isSampleFieldRemapViewRenderData({
        kind: 'workbench-kit.samples.jdw.view',
      }),
    ).toBe(false);
    expect(isSampleFieldRemapViewRenderData(null)).toBe(false);
  });

  it('projects its extension render data through the sample view host factory', () => {
    let renderData: unknown = { kind: SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND };
    const providerHost = {
      dispose() {},
      render: () => renderData,
      title: 'Schema Mapper',
    };
    const host = SAMPLE_FIELD_REMAP_VIEW_HOST_FACTORY.create({
      provider: {
        viewId: SAMPLE_FIELD_REMAP_VIEW_ID,
        resolveViewHost: () => providerHost,
      },
      viewId: SAMPLE_FIELD_REMAP_VIEW_ID,
    });
    const node = host.render();

    expect(host).toBe(providerHost);
    expect(isValidElement(node) ? node.type : undefined).toBe(SampleFieldRemapView);
    expect(host.title).toBe('Schema Mapper');

    renderData = { kind: 'unsupported' };
    expect(toWorkbenchViewHostReactNode(host.render(), 'Fallback')).toBe('Fallback');
  });
});
