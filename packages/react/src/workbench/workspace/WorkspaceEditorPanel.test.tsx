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
