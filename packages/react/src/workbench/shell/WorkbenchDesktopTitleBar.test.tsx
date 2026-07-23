import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchDesktopTitleBar } from './WorkbenchDesktopTitleBar';
import { WorkbenchPlatformProvider } from '../chrome/WorkbenchPlatformContext';

const windowControls = {
  isMaximized: false,
  onClose: () => undefined,
  onMinimize: () => undefined,
  onToggleMaximized: () => undefined,
} as const;

describe('WorkbenchDesktopTitleBar', () => {
  it('renders leading, center, and trailing slots', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchDesktopTitleBar
        centerSlot={<span>Search</span>}
        leading={<span>App</span>}
        trailing={<span>Extra</span>}
      />,
    );

    expect(markup).toContain('class="ui-workbench-desktop-titlebar"');
    expect(markup).toContain('ui-workbench-desktop-titlebar__leading');
    expect(markup).toContain('ui-workbench-desktop-titlebar__center');
    expect(markup).toContain('ui-workbench-desktop-titlebar__trailing');
    expect(markup).toContain('Search');
    expect(markup).toContain('App');
    expect(markup).toContain('Extra');
  });

  it('omits the center slot entirely when not provided', () => {
    const markup = renderToStaticMarkup(<WorkbenchDesktopTitleBar leading={<span>App</span>} />);

    expect(markup).not.toContain('ui-workbench-desktop-titlebar__center');
  });

  it('renders win32 caption buttons in the trailing slot for platform chrome', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPlatformProvider platform="win32">
        <WorkbenchDesktopTitleBar chrome="platform" windowControls={windowControls} />
      </WorkbenchPlatformProvider>,
    );

    expect(markup).toContain('data-workbench-window-chrome="platform"');
    expect(markup).toContain('ui-workbench-window-chrome-controls--win32');
    expect(markup).toContain('codicon-chrome-minimize');
    expect(markup).toContain('codicon-chrome-maximize');
    expect(markup).toContain('codicon-chrome-close');
    expect(markup.indexOf('ui-workbench-desktop-titlebar__trailing')).toBeLessThan(
      markup.indexOf('ui-workbench-window-chrome-controls--win32'),
    );
  });

  it('renders darwin traffic lights in the leading slot for platform chrome', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPlatformProvider platform="darwin">
        <WorkbenchDesktopTitleBar
          chrome="platform"
          leading={<span>App</span>}
          windowControls={windowControls}
        />
      </WorkbenchPlatformProvider>,
    );

    expect(markup).toContain('ui-workbench-window-chrome-controls--darwin');
    expect(markup).toContain('ui-workbench-window-chrome-control--close');
    expect(markup).toContain('ui-workbench-window-chrome-control--minimize');
    expect(markup).toContain('ui-workbench-window-chrome-control--zoom');
    expect(markup.indexOf('ui-workbench-window-chrome-controls--darwin')).toBeLessThan(
      markup.indexOf('>App<'),
    );
    expect(markup).not.toContain('codicon-chrome-minimize');
  });

  it('swaps the maximize icon and label when isMaximized is true', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPlatformProvider platform="win32">
        <WorkbenchDesktopTitleBar
          chrome="platform"
          windowControls={{
            ...windowControls,
            isMaximized: true,
          }}
        />
      </WorkbenchPlatformProvider>,
    );

    expect(markup).toContain('codicon-chrome-restore');
    expect(markup).not.toContain('codicon-chrome-maximize"');
    expect(markup).toContain('aria-label="Restore window"');
  });

  it('omits window controls entirely when not provided', () => {
    const markup = renderToStaticMarkup(<WorkbenchDesktopTitleBar leading={<span>App</span>} />);

    expect(markup).not.toContain('ui-workbench-desktop-titlebar__controls');
    expect(markup).not.toContain('ui-workbench-window-chrome-controls');
  });
});
