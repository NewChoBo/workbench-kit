import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { workbenchTreeIndentOffset } from './layoutHelpers';
import { SideBarListItem, SideBarViewFrame, sideBarTreeDepthStyle } from './SideBarViewFrame';

describe('SideBarViewFrame tree indentation', () => {
  it('uses the shared workbench tree indent calculation', () => {
    expect(workbenchTreeIndentOffset(0)).toBe('4px');
    expect(workbenchTreeIndentOffset(1)).toBe('14px');
    expect(workbenchTreeIndentOffset(2)).toBe('24px');
  });

  it('applies depth as CSS variables for sidebar tree rows', () => {
    expect(sideBarTreeDepthStyle(2)).toMatchObject({
      '--depth': 2,
      '--ui-side-bar-tree-indent-offset': '24px',
    });

    const markup = renderToStaticMarkup(<SideBarListItem depth={2}>Nested file</SideBarListItem>);

    expect(markup).toContain('--depth:2');
    expect(markup).toContain('--ui-side-bar-tree-indent-offset:24px');
    expect(markup).toContain('Nested file');
  });
});

describe('SideBarViewFrame stable slots', () => {
  it('reserves the header actions slot for delayed actions', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewFrame title="Chat">
        <div>Messages</div>
      </SideBarViewFrame>,
    );

    expect(markup).toContain('ui-panel-header__actions');
    expect(markup).toContain('data-empty="true"');
  });

  it('does not reserve primary sidebar scrollbar gutter by default', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewFrame title="Explorer">
        <div>Short list</div>
      </SideBarViewFrame>,
    );

    expect(markup).toContain('ui-side-bar-view__body');
    expect(markup).not.toContain('ui-scroll-area--stable-gutter');
  });

  it('keeps overlay footer and spacer slots even before footer content is ready', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewFrame footerPlacement="overlay" title="Chat">
        <div>Messages</div>
      </SideBarViewFrame>,
    );

    expect(markup).toContain('ui-side-bar-scroll-spacer');
    expect(markup).toContain('ui-side-bar-view__footer--overlay');
    expect(markup).toContain('ui-side-bar-view__footer--empty');
    expect(markup).toContain('data-has-footer-content="false"');
  });
});
