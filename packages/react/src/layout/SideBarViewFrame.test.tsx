import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { workbenchTreeIndentOffset } from './layoutHelpers';
import { SideBarListItem, sideBarTreeDepthStyle } from './SideBarViewFrame';

describe('SideBarViewFrame tree indentation', () => {
  it('uses the shared workbench tree indent calculation', () => {
    expect(workbenchTreeIndentOffset(0)).toBe('8px');
    expect(workbenchTreeIndentOffset(1)).toBe('22px');
    expect(workbenchTreeIndentOffset(2)).toBe('36px');
  });

  it('applies depth as CSS variables for sidebar tree rows', () => {
    expect(sideBarTreeDepthStyle(2)).toMatchObject({
      '--depth': 2,
      '--ui-side-bar-tree-indent-offset': '36px',
    });

    const markup = renderToStaticMarkup(<SideBarListItem depth={2}>Nested file</SideBarListItem>);

    expect(markup).toContain('--depth:2');
    expect(markup).toContain('--ui-side-bar-tree-indent-offset:36px');
    expect(markup).toContain('Nested file');
  });
});
