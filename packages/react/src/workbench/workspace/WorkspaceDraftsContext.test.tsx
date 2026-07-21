/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { WorkspaceDraftsProvider, useWorkspaceDrafts } from './WorkspaceDraftsContext';

function DraftProbe({ path = '/src//App.tsx' }: { path?: string }) {
  const drafts = useWorkspaceDrafts();
  const content = drafts.getDraft(path, 'saved');
  const dirty = drafts.isDirty(path, 'saved');

  return (
    <section>
      <output aria-label="draft content">{content}</output>
      <output aria-label="dirty state">{dirty ? 'dirty' : 'clean'}</output>
      <output aria-label="dirty count">{drafts.dirtyCount}</output>
      <output aria-label="dirty paths">{drafts.dirtyPaths.join(',')}</output>
      <button onClick={() => drafts.updateDraft(path, 'local edit', 'saved')}>Edit</button>
      <button onClick={() => drafts.saveDraft(path, 'local edit')}>Save</button>
      <button onClick={() => drafts.discardDraft(path, 'saved')}>Discard</button>
      <button onClick={() => drafts.resetDrafts()}>Reset</button>
    </section>
  );
}

describe('WorkspaceDraftsContext', () => {
  it('tracks normalized dirty draft state through the provider', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceDraftsProvider>
          <DraftProbe />
        </WorkspaceDraftsProvider>,
      );
    });

    expect(text(container, 'draft content')).toBe('saved');
    expect(text(container, 'dirty state')).toBe('clean');

    await click(container, 'Edit');
    expect(text(container, 'draft content')).toBe('local edit');
    expect(text(container, 'dirty state')).toBe('dirty');
    expect(text(container, 'dirty count')).toBe('1');
    expect(text(container, 'dirty paths')).toBe('src/App.tsx');

    await click(container, 'Save');
    expect(text(container, 'dirty state')).toBe('clean');
    expect(text(container, 'dirty count')).toBe('0');

    await click(container, 'Discard');
    expect(text(container, 'draft content')).toBe('saved');
    expect(text(container, 'dirty state')).toBe('clean');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('provides a local controller when no provider is mounted', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DraftProbe path="README.md" />);
    });

    await click(container, 'Edit');
    expect(text(container, 'dirty state')).toBe('dirty');
    expect(text(container, 'dirty paths')).toBe('README.md');

    await click(container, 'Reset');
    expect(text(container, 'dirty state')).toBe('clean');
    expect(text(container, 'dirty count')).toBe('0');

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

function text(container: HTMLElement, label: string): string | null | undefined {
  return container.querySelector(`[aria-label="${label}"]`)?.textContent;
}
