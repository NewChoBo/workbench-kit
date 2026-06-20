/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { resolveExplorerRevealPath } from './explorer-view-data.js';
import {
  applyExplorerPathReveal,
  publishExplorerRevealRequest,
  runExplorerHostCommandSideEffects,
  subscribeExplorerRevealRequest,
} from './explorer-reveal.js';

describe('explorer-reveal', () => {
  it('resolves reveal paths from command input or result', () => {
    expect(resolveExplorerRevealPath({ path: 'src/App.tsx' }, undefined)).toBe('src/App.tsx');
    expect(resolveExplorerRevealPath(undefined, { path: 'README.md' })).toBe('README.md');
    expect(resolveExplorerRevealPath({ paths: ['docs/guide.md'] }, undefined)).toBe(
      'docs/guide.md',
    );
  });

  it('expands parent folders and selects the target path', () => {
    const revealFolder = vi.fn();
    const setSelection = vi.fn();

    applyExplorerPathReveal('src/components/Button.tsx', {
      revealFolder,
      setSelection,
    });

    expect(revealFolder).toHaveBeenCalledTimes(2);
    expect(revealFolder).toHaveBeenNthCalledWith(1, 'src');
    expect(revealFolder).toHaveBeenNthCalledWith(2, 'src/components');
    expect(setSelection).toHaveBeenCalledWith({
      anchorPath: 'src/components/Button.tsx',
      focusedPath: 'src/components/Button.tsx',
      paths: ['src/components/Button.tsx'],
    });
  });

  it('delivers pending reveal requests when the explorer subscribes', () => {
    publishExplorerRevealRequest('src/App.tsx');

    const listener = vi.fn();
    const unsubscribe = subscribeExplorerRevealRequest(listener);

    expect(listener).toHaveBeenCalledWith('src/App.tsx');

    publishExplorerRevealRequest('README.md');
    expect(listener).toHaveBeenCalledWith('README.md');

    unsubscribe();
    publishExplorerRevealRequest('config.json');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('focuses explorer and publishes reveal paths for reveal commands', async () => {
    const focusExplorerView = vi.fn();
    const revealPath = vi.fn();

    await runExplorerHostCommandSideEffects(
      'workbench-kit.builtin.explorer.reveal',
      [{ path: 'src/App.tsx' }],
      { path: 'src/App.tsx', viewId: 'workbench-kit.builtin.explorer.tree' },
      {
        focusExplorerView,
        revealPath,
      },
    );

    expect(focusExplorerView).toHaveBeenCalledTimes(1);
    expect(revealPath).toHaveBeenCalledWith('src/App.tsx');
  });

  it('focuses explorer for focus commands without publishing reveal paths', async () => {
    const focusExplorerView = vi.fn();
    const revealPath = vi.fn();

    await runExplorerHostCommandSideEffects(
      'workbench-kit.builtin.explorer.focus',
      [],
      { focused: true, viewId: 'workbench-kit.builtin.explorer.tree' },
      {
        focusExplorerView,
        revealPath,
      },
    );

    expect(focusExplorerView).toHaveBeenCalledTimes(1);
    expect(revealPath).not.toHaveBeenCalled();
  });
});
