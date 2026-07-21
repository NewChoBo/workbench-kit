import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContextMenu } from './ContextMenu';

describe('ContextMenu', () => {
  it('omits icon and shortcut columns when items have neither', () => {
    const markup = renderToStaticMarkup(
      <ContextMenu
        items={[
          { id: 'open', label: 'Open', onSelect: vi.fn() },
          { id: 'delete', label: 'Delete', onSelect: vi.fn() },
        ]}
        x={12}
        y={24}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('data-has-icons="false"');
    expect(markup).toContain('data-has-shortcuts="false"');
    expect(markup).not.toContain('ui-context-menu__icon');
    expect(markup).not.toContain('ui-context-menu__shortcut');
  });

  it('reserves the icon column when any item provides an icon', () => {
    const markup = renderToStaticMarkup(
      <ContextMenu
        items={[
          { id: 'open', label: 'Open', icon: 'codicon-folder-opened', onSelect: vi.fn() },
          { id: 'delete', label: 'Delete', onSelect: vi.fn() },
        ]}
        x={12}
        y={24}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('data-has-icons="true"');
    expect(markup).toContain('data-has-shortcuts="false"');
    expect(markup.match(/ui-context-menu__icon/g)?.length).toBe(2);
  });

  it('reserves the shortcut column when any item provides a shortcut', () => {
    const markup = renderToStaticMarkup(
      <ContextMenu
        items={[
          { id: 'open', label: 'Open', shortcut: 'Enter', onSelect: vi.fn() },
          { id: 'delete', label: 'Delete', onSelect: vi.fn() },
        ]}
        x={12}
        y={24}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('data-has-shortcuts="true"');
    expect(markup).toContain('ui-context-menu__shortcut');
  });
});
