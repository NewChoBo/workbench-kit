/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import {
  WorkbenchKeybindingManagementSettingsView,
  type WorkbenchKeybindingManagementSettingsViewProps,
} from '../keybinding-management-settings.js';
import { WorkbenchProvider } from '../shell/provider.js';
import { WorkbenchKeybindingManagementSettings } from './keybinding-settings.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Workbench keybinding management Settings composition', () => {
  it('renders the focused View without a Provider and forwards reset operations', async () => {
    const resetKeybinding = vi.fn();
    const setKeybinding = vi.fn();
    const props: WorkbenchKeybindingManagementSettingsViewProps = {
      entries: [
        {
          commandId: 'workbench.test.command',
          commandLabel: 'Test command',
          defaultKey: 'Ctrl+F11',
          defaultKeyLabel: 'Ctrl+F11',
          editable: true,
          effectiveKey: 'Ctrl+F10',
          effectiveKeyLabel: 'Ctrl+F10',
          storedKeys: ['Ctrl+F10'],
          userKey: 'Ctrl+F10',
          userKeyLabel: 'Ctrl+F10',
        },
      ],
      overrideCount: 1,
      platform: 'windows',
      resetKeybinding,
      setKeybinding,
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<WorkbenchKeybindingManagementSettingsView {...props} />);
      });

      expect(container.textContent).toContain('Keyboard Shortcuts');
      expect(container.textContent).toContain('1 command · 1 user override');
      expect(container.textContent).toContain('Test command');
      const reset = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === 'Reset to default',
      );
      await act(async () => reset?.click());
      expect(resetKeybinding).toHaveBeenCalledOnce();
      expect(resetKeybinding).toHaveBeenCalledWith('workbench.test.command');
      expect(setKeybinding).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('keeps the broad-root zero-prop component provider-bound and render-compatible', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <WorkbenchProvider persistKeybindingOverrides={false}>
            <WorkbenchKeybindingManagementSettings />
          </WorkbenchProvider>,
        );
      });

      expect(container.textContent).toContain('Keyboard Shortcuts');
      expect(container.textContent).toContain('user overrides');
    } finally {
      await act(async () => root.unmount());
    }
  });
});
