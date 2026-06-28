import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchDesktopTitleBar } from './WorkbenchDesktopTitleBar';

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

  it('renders minimize, maximize, and close buttons when windowControls is provided', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchDesktopTitleBar
        windowControls={{
          isMaximized: false,
          onClose: () => undefined,
          onMinimize: () => undefined,
          onToggleMaximized: () => undefined,
        }}
      />,
    );

    expect(markup).toContain('codicon-chrome-minimize');
    expect(markup).toContain('codicon-chrome-maximize');
    expect(markup).toContain('codicon-chrome-close');
    expect(markup).toContain('aria-label="Minimize window"');
    expect(markup).toContain('aria-label="Maximize window"');
    expect(markup).toContain('aria-label="Close window"');
  });

  it('swaps the maximize icon and label when isMaximized is true', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchDesktopTitleBar
        windowControls={{
          isMaximized: true,
          onClose: () => undefined,
          onMinimize: () => undefined,
          onToggleMaximized: () => undefined,
        }}
      />,
    );

    expect(markup).toContain('codicon-chrome-restore');
    expect(markup).not.toContain('codicon-chrome-maximize"');
    expect(markup).toContain('aria-label="Restore window"');
  });

  it('omits window controls entirely when not provided', () => {
    const markup = renderToStaticMarkup(<WorkbenchDesktopTitleBar leading={<span>App</span>} />);

    expect(markup).not.toContain('ui-workbench-desktop-titlebar__controls');
  });
});
