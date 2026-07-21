import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  WORKBENCH_FILL_SCROLL_ROLE_ATTR,
  isWorkbenchFillOwner,
  isWorkbenchScrollOwner,
  resolveWorkbenchFillScrollRole,
  workbenchFillScrollRoleProps,
} from './fillScrollContract';
import { WorkbenchFill, WorkbenchFillChain, WorkbenchScrollRegion } from './WorkbenchLayoutBase';

describe('fillScrollContract', () => {
  const registry = {
    fillOwners: ['editor-root', 'center-stage'],
    scrollOwners: ['details-panel', 'layers-pane'],
  } as const;

  it('exposes a stable DOM role attribute', () => {
    expect(WORKBENCH_FILL_SCROLL_ROLE_ATTR).toBe('data-ui-fill-scroll-role');
    expect(workbenchFillScrollRoleProps('fill')).toEqual({
      'data-ui-fill-scroll-role': 'fill',
    });
    expect(workbenchFillScrollRoleProps('scroll')).toEqual({
      'data-ui-fill-scroll-role': 'scroll',
    });
  });

  it('resolves roles from a host owner registry without requiring overlap', () => {
    for (const owner of registry.fillOwners) {
      expect(resolveWorkbenchFillScrollRole(owner, registry)).toBe('fill');
      expect(isWorkbenchFillOwner(owner, registry.fillOwners)).toBe(true);
      expect(isWorkbenchScrollOwner(owner, registry.scrollOwners)).toBe(false);
    }
    for (const owner of registry.scrollOwners) {
      expect(resolveWorkbenchFillScrollRole(owner, registry)).toBe('scroll');
      expect(isWorkbenchScrollOwner(owner, registry.scrollOwners)).toBe(true);
      expect(isWorkbenchFillOwner(owner, registry.fillOwners)).toBe(false);
    }

    const overlap = registry.fillOwners.filter((owner) =>
      (registry.scrollOwners as readonly string[]).includes(owner),
    );
    expect(overlap).toEqual([]);
  });

  it('prefers scroll when an owner id is listed in both registries', () => {
    expect(
      resolveWorkbenchFillScrollRole('shared', {
        fillOwners: ['shared'],
        scrollOwners: ['shared'],
      }),
    ).toBe('scroll');
  });
});

describe('WorkbenchFill / WorkbenchFillChain / WorkbenchScrollRegion', () => {
  it('stamps fill and scroll role markers on layout nodes', () => {
    const fill = renderToStaticMarkup(createElement(WorkbenchFill, null, 'fill'));
    const chain = renderToStaticMarkup(createElement(WorkbenchFillChain, null, 'chain'));
    const scroll = renderToStaticMarkup(createElement(WorkbenchScrollRegion, null, 'scroll'));

    expect(fill).toContain(`${WORKBENCH_FILL_SCROLL_ROLE_ATTR}="fill"`);
    expect(fill).toContain('ui-workbench-fill');
    expect(chain).toContain(`${WORKBENCH_FILL_SCROLL_ROLE_ATTR}="fill"`);
    expect(chain).toContain('ui-workbench-fill-chain');
    expect(scroll).toContain(`${WORKBENCH_FILL_SCROLL_ROLE_ATTR}="scroll"`);
    expect(scroll).toContain('ui-workbench-scroll-region');
  });
});
