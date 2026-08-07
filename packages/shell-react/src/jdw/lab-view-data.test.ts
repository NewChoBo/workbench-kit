import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
  SAMPLE_JDW_LAB_VIEW_HOST_FACTORY,
  SampleJdwLabView,
  type SampleJdwLabViewProps,
} from './lab-view.js';
import {
  isSampleJdwLabViewRenderData,
  SAMPLE_JDW_LAB_VIEW_ID,
  SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
} from './lab-view-data.js';
import { toWorkbenchViewHostReactNode } from '../shell/view-host.js';

describe('isSampleJdwLabViewRenderData', () => {
  it('accepts the canonical JDW template and widget-tree paths', () => {
    expect(
      isSampleJdwLabViewRenderData({
        kind: SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
        templateJdwPath: 'jdw/templates/analytics-dashboard.jdw.json',
        widgetTreePath: 'jdw/showcase/example.jdw.json',
      }),
    ).toBe(true);
  });

  it('rejects the removed Screen Spec lab field', () => {
    expect(
      isSampleJdwLabViewRenderData({
        kind: SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
        screenSpecLabPath: 'labs/screen-spec.lab.json',
        widgetTreePath: 'jdw/showcase/example.jdw.json',
      }),
    ).toBe(false);
  });

  it('projects its extension render data through the sample view host factory', () => {
    let renderData: unknown = {
      kind: SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
      templateJdwPath: 'templates/card.jdw.json',
      widgetTreePath: 'showcase/card.jdw.json',
    };
    const providerHost = {
      dispose() {},
      render: () => renderData,
      title: 'JDW Lab',
    };
    const host = SAMPLE_JDW_LAB_VIEW_HOST_FACTORY.create({
      provider: {
        viewId: SAMPLE_JDW_LAB_VIEW_ID,
        resolveViewHost: () => providerHost,
      },
      viewId: SAMPLE_JDW_LAB_VIEW_ID,
    });
    const node = host.render();

    expect(host).toBe(providerHost);
    expect(isValidElement(node) ? node.type : undefined).toBe(SampleJdwLabView);
    expect(
      isValidElement(node) ? (node as ReactElement<SampleJdwLabViewProps>).props : undefined,
    ).toEqual({
      templateJdwPath: 'templates/card.jdw.json',
      widgetTreePath: 'showcase/card.jdw.json',
    });
    expect(host.title).toBe('JDW Lab');

    renderData = { kind: 'unsupported' };
    expect(toWorkbenchViewHostReactNode(host.render(), 'Fallback')).toBe('Fallback');
  });
});
