/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { WorkspaceDraftsProvider } from './WorkspaceDraftsContext.js';
import { WorkspaceEditorPanel } from './WorkspaceEditorPanel.js';

describe('WorkspaceEditorPanel', () => {
  it('blocks host-level save when canSaveFile rejects the draft content', async () => {
    const saved: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceDraftsProvider>
          <WorkspaceEditorPanel
            canSaveFile={(_path, content) => content !== 'invalid'}
            files={[{ path: 'widget.jdw.json', content: 'saved' }]}
            openPaths={['widget.jdw.json']}
            selectedPath="widget.jdw.json"
            renderEditor={({ content, onChange }) => (
              <section>
                <output aria-label="editor content">{content}</output>
                <button onClick={() => onChange('invalid')}>Make invalid</button>
              </section>
            )}
            onSaveFile={(_path, content) => {
              saved.push(content);
              return undefined;
            }}
            onSelectedPathChange={() => undefined}
          />
        </WorkspaceDraftsProvider>,
      );
    });

    await click(container, 'Make invalid');
    await pressSave(container);

    expect(saved).toEqual([]);
    expect(container.querySelector('[aria-label="Unsaved changes"]')).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('allows host-level save when canSaveFile accepts the draft content', async () => {
    const saved: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceDraftsProvider>
          <WorkspaceEditorPanel
            canSaveFile={(_path, content) => content === 'valid'}
            files={[{ path: 'widget.jdw.json', content: 'saved' }]}
            openPaths={['widget.jdw.json']}
            selectedPath="widget.jdw.json"
            renderEditor={({ content, onChange }) => (
              <section>
                <output aria-label="editor content">{content}</output>
                <button onClick={() => onChange('valid')}>Make valid</button>
              </section>
            )}
            onSaveFile={(_path, content) => {
              saved.push(content);
              return undefined;
            }}
            onSelectedPathChange={() => undefined}
          />
        </WorkspaceDraftsProvider>,
      );
    });

    await click(container, 'Make valid');
    await pressSave(container);

    expect(saved).toEqual(['valid']);
    expect(container.querySelector('[aria-label="Unsaved changes"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('skips panel Ctrl/Cmd+S when saveShortcutMode is editor with renderEditor', async () => {
    const saved: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceDraftsProvider>
          <WorkspaceEditorPanel
            files={[{ path: 'notes.md', content: 'draft' }]}
            openPaths={['notes.md']}
            renderEditor={({ content }) => <output aria-label="editor content">{content}</output>}
            saveShortcutMode="editor"
            selectedPath="notes.md"
            onSaveFile={(_path, content) => {
              saved.push(content);
              return undefined;
            }}
            onSelectedPathChange={() => undefined}
          />
        </WorkspaceDraftsProvider>,
      );
    });

    await pressSave(container);
    expect(saved).toEqual([]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('lets onSaveShortcut own panel Ctrl/Cmd+S without calling save', async () => {
    const saved: string[] = [];
    const intercepted: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceDraftsProvider>
          <WorkspaceEditorPanel
            files={[{ path: 'notes.md', content: 'draft' }]}
            openPaths={['notes.md']}
            selectedPath="notes.md"
            onSaveFile={(_path, content) => {
              saved.push(content);
              return undefined;
            }}
            onSaveShortcut={({ content }) => {
              intercepted.push(content);
            }}
            onSelectedPathChange={() => undefined}
          />
        </WorkspaceDraftsProvider>,
      );
    });

    await pressSave(container);
    expect(intercepted).toEqual(['draft']);
    expect(saved).toEqual([]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps Close to the right hidden when the full editor context does not advertise support', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceDraftsProvider>
          <WorkspaceEditorPanel
            files={[
              { path: 'first.md', content: 'first' },
              { path: 'second.md', content: 'second' },
            ]}
            openPaths={['first.md', 'second.md']}
            selectedPath="first.md"
            onCloseAll={() => undefined}
            onCloseOthers={() => undefined}
            onClosePath={() => undefined}
            onSelectedPathChange={() => undefined}
          />
        </WorkspaceDraftsProvider>,
      );
    });

    const firstTab = container.querySelector('[title="first.md"]');
    expect(firstTab).toBeTruthy();
    await act(async () => {
      firstTab?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });

    const menu = document.querySelector('[aria-label="Editor tab menu"]');
    expect(menu).toBeTruthy();
    expect(menu?.textContent).not.toContain('Close to the right');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

async function click(container: HTMLElement, label: string): Promise<void> {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === label,
  );
  expect(button).toBeDefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function pressSave(container: HTMLElement): Promise<void> {
  const editor = container.querySelector<HTMLElement>('.workspace-editor');
  expect(editor).toBeDefined();

  await act(async () => {
    editor?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        key: 's',
      }),
    );
    await Promise.resolve();
  });
}
