/** @vitest-environment jsdom */

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkbenchStorageAdapter } from '@workbench-kit/workbench-core';

import {
  DEFAULT_WORKBENCH_APPEARANCE,
  type WorkbenchAppearanceSettings,
} from './appearance-storage.js';
import {
  usePersistedWorkbenchAppearance,
  type UsePersistedWorkbenchAppearanceOptions,
} from './use-persisted-appearance.js';

type AppearanceHookValue = ReturnType<typeof usePersistedWorkbenchAppearance>;

function AppearanceProbe({
  onValue,
  options,
}: {
  onValue: (value: AppearanceHookValue) => void;
  options: UsePersistedWorkbenchAppearanceOptions;
}) {
  const value = usePersistedWorkbenchAppearance(options);

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

describe('usePersistedWorkbenchAppearance', () => {
  it('does not passively overwrite a failed-read fallback before a real mutation', async () => {
    const values = new Map<string, string>([
      [
        'appearance-a',
        JSON.stringify({
          darkPreset: 'modern',
          lightPreset: 'light-plus',
          shellPreset: 'airy',
          themePreference: 'dark',
        }),
      ],
    ]);
    let reads = 0;
    let writes = 0;
    const storage: WorkbenchStorageAdapter = {
      getItem() {
        reads += 1;
        throw new Error('temporary browser storage failure');
      },
      setItem(key, value) {
        writes += 1;
        values.set(key, value);
      },
    };
    const diagnostics = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: AppearanceHookValue | undefined;
    const onValue = (value: AppearanceHookValue) => {
      latest = value;
    };

    await act(async () => {
      root.render(
        <StrictMode>
          <AppearanceProbe
            onValue={onValue}
            options={{
              onPersistenceDiagnostic: diagnostics,
              storage,
              storageKey: 'appearance-a',
            }}
          />
        </StrictMode>,
      );
    });

    expect(latest?.[0]).toEqual(DEFAULT_WORKBENCH_APPEARANCE);
    expect(writes).toBe(0);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics).toHaveBeenLastCalledWith({
      code: 'read_failed',
      message: 'Workbench storage could not be read.',
      operation: 'read',
      storageKey: 'appearance-a',
    });

    const readsAfterInitialization = reads;
    await act(async () => {
      root.render(
        <StrictMode>
          <AppearanceProbe
            onValue={onValue}
            options={{
              onPersistenceDiagnostic: (diagnostic) => diagnostics(diagnostic),
              storage,
              storageKey: 'appearance-b',
            }}
          />
        </StrictMode>,
      );
    });

    expect(reads).toBe(readsAfterInitialization);
    expect(writes).toBe(0);
    expect(diagnostics).toHaveBeenCalledTimes(1);

    const next: WorkbenchAppearanceSettings = {
      darkPreset: 'modern',
      lightPreset: 'light-plus',
      shellPreset: 'airy',
      themePreference: 'light',
    };
    await act(async () => {
      latest?.[1](next);
    });

    expect(writes).toBe(1);
    expect(JSON.parse(values.get('appearance-b') ?? '{}')).toEqual(next);

    await act(async () => {
      root.unmount();
    });
  });
});
