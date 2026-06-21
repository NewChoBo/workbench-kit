/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import type { WorkbenchCommandDescriptor } from '../CommandPalette';
import { useSlashCommandSuggest } from './useSlashCommandSuggest';

const commands: WorkbenchCommandDescriptor[] = [
  { id: 'workspace.first', label: 'First command' },
  { id: 'workspace.second', label: 'Second command' },
  { id: 'workspace.third', label: 'Third command' },
];

function SlashCommandSuggestHarness({ value }: { value: string }) {
  const [selectedCommandId, setSelectedCommandId] = useState('');
  const suggest = useSlashCommandSuggest({ commands, value });

  return (
    <textarea
      aria-label="Composer"
      data-active-command-id={suggest.activeCommand?.id ?? ''}
      data-selected-command-id={selectedCommandId}
      onKeyDown={(event) => suggest.handleKeyDown(event, setSelectedCommandId)}
    />
  );
}

describe('useSlashCommandSuggest', () => {
  it('supports keyboard navigation and tab selection', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SlashCommandSuggestHarness value="/" />);
    });

    const textarea = container.querySelector('textarea');
    expect(textarea?.dataset.activeCommandId).toBe('workspace.first');

    await act(async () => {
      textarea?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    });

    expect(textarea?.dataset.activeCommandId).toBe('workspace.second');

    await act(async () => {
      textarea?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    });

    expect(textarea?.dataset.selectedCommandId).toBe('workspace.second');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('resets the active command when the slash query changes', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SlashCommandSuggestHarness value="/" />);
    });

    const textarea = container.querySelector('textarea');

    await act(async () => {
      textarea?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    });

    expect(textarea?.dataset.activeCommandId).toBe('workspace.second');

    await act(async () => {
      root.render(<SlashCommandSuggestHarness value="/third" />);
    });

    expect(textarea?.dataset.activeCommandId).toBe('workspace.third');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('opens from the current slash token inside a message draft', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SlashCommandSuggestHarness value="please run /" />);
    });

    const textarea = container.querySelector('textarea');
    expect(textarea?.dataset.activeCommandId).toBe('workspace.first');

    await act(async () => {
      textarea?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    });

    expect(textarea?.dataset.activeCommandId).toBe('workspace.second');

    await act(async () => {
      root.render(<SlashCommandSuggestHarness value="please run /third" />);
    });

    expect(textarea?.dataset.activeCommandId).toBe('workspace.third');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
