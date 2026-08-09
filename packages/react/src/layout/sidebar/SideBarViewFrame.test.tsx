import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { workbenchTreeIndentOffset } from '../layoutHelpers';
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
      '--ui-sidebar-tree-indent-offset': '24px',
    });

    const markup = renderToStaticMarkup(<SideBarListItem depth={2}>Nested file</SideBarListItem>);

    expect(markup).toContain('--depth:2');
    expect(markup).toContain('--ui-sidebar-tree-indent-offset:24px');
    expect(markup).toContain('Nested file');
  });
});

describe('SideBarListItem after slot', () => {
  it('renders after as a sibling inside the list entry', () => {
    const markup = renderToStaticMarkup(
      <SideBarListItem after={<span data-testid="after-action">Toggle</span>}>Row</SideBarListItem>,
    );

    expect(markup).toContain('ui-sidebar-list-entry');
    expect(markup).toContain('ui-sidebar-list-item');
    expect(markup).toContain('data-testid="after-action"');
    expect(markup.indexOf('ui-sidebar-list-item')).toBeLessThan(
      markup.indexOf('data-testid="after-action"'),
    );
  });

  it('keeps list-entry flex so after actions stay on the same row', () => {
    const sidebarViewCss = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), './sidebar-view.css'),
      'utf8',
    ).replace(/\r\n/g, '\n');

    expect(sidebarViewCss).toMatch(
      /\.ui-sidebar-list-entry \{\n(?:[^\n]*\n)*? {2}display: flex;\n(?:[^\n]*\n)*? {2}align-items: center;/,
    );
    expect(sidebarViewCss).toContain(
      '.ui-sidebar-row .ui-sidebar-list-item,\n.ui-sidebar-list-entry .ui-sidebar-list-item',
    );
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

  it('renders headerAddon outside the scrollable body', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewFrame headerAddon={<div data-testid="header-addon">Search</div>} title="Library">
        <div data-testid="body-content">List</div>
      </SideBarViewFrame>,
    );

    expect(markup).toContain('ui-sidebar-view__header-addon');
    expect(markup.indexOf('data-testid="header-addon"')).toBeLessThan(
      markup.indexOf('ui-sidebar-view__body'),
    );
    expect(markup.indexOf('ui-sidebar-view__body')).toBeLessThan(
      markup.indexOf('data-testid="body-content"'),
    );
  });

  it('does not reserve primary sidebar scrollbar gutter by default', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewFrame title="Explorer">
        <div>Short list</div>
      </SideBarViewFrame>,
    );

    expect(markup).toContain('ui-sidebar-view__body');
    expect(markup).not.toContain('ui-scroll-area--stable-gutter');
  });

  it('keeps the primary sidebar no-gutter policy owned by Workbench chrome', () => {
    const scrollbarsCss = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../scrollbars.css'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const workbenchLayoutCss = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../workbench/chrome/workbench-layout-regions.css',
      ),
      'utf8',
    ).replace(/\r\n/g, '\n');

    expect(scrollbarsCss).toContain('[data-theme]');
    expect(scrollbarsCss).not.toContain('.workbench-primary-sidebar .ui-sidebar-view__body');
    expect(workbenchLayoutCss).toContain('.workbench-primary-sidebar .ui-sidebar-view__body');
    expect(workbenchLayoutCss).toContain(
      '.workbench-primary-sidebar .ui-sidebar-view__body::-webkit-scrollbar',
    );
  });

  it('keeps overlay footer and spacer slots even before footer content is ready', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewFrame footerPlacement="overlay" title="Chat">
        <div>Messages</div>
      </SideBarViewFrame>,
    );

    expect(markup).toContain('ui-sidebar-scroll-spacer');
    expect(markup).toContain('ui-sidebar-view__footer--overlay');
    expect(markup).toContain('ui-sidebar-view__footer--empty');
    expect(markup).toContain('data-has-footer-content="false"');
  });
});
