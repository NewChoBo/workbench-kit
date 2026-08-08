/** @vitest-environment jsdom */

import { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { useEditorDocumentViewProviders } from '../editor/use-editor.js';
import { WorkbenchProvider, useWorkbench } from '../shell/provider.js';
import { BUILTIN_WORKBENCH_EXTENSIONS } from '../extensions/builtin-extensions.js';
import { SAMPLE_WORKBENCH_EXTENSIONS } from '../../../../examples/workbench-sample/src/sample-extensions.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('samples.jdw provider wiring through WorkbenchProvider', () => {
  it('exposes JDW document view providers after startup', async () => {
    function Probe() {
      const { waitForExtensionStartup, missingExtensionIds } = useWorkbench();
      const providers = useEditorDocumentViewProviders();
      const [ready, setReady] = useState(false);

      useEffect(() => {
        void waitForExtensionStartup().then(() => setReady(true));
      }, [waitForExtensionStartup]);

      return (
        <pre data-testid="probe">
          {JSON.stringify({
            ready,
            missing: missingExtensionIds,
            providers: providers.map((provider) => provider.id).sort(),
          })}
        </pre>
      );
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor', 'workbench-kit.samples.jdw'],
            recommendations: [],
          }}
        >
          <Probe />
        </WorkbenchProvider>,
      );
    });

    for (let index = 0; index < 40; index += 1) {
      const payload = container.querySelector('[data-testid="probe"]')?.textContent ?? '';
      if (payload.includes('"ready":true')) {
        break;
      }
      await act(async () => {
        await Promise.resolve();
      });
    }

    const payload = JSON.parse(
      container.querySelector('[data-testid="probe"]')?.textContent ?? '{}',
    ) as {
      ready?: boolean;
      missing?: string[];
      providers?: string[];
    };

    expect(payload.ready).toBe(true);
    expect(payload.missing ?? []).toEqual([]);
    expect(payload.providers).toEqual(
      expect.arrayContaining([
        'workbench-kit.samples.jdw.widget-form',
        'workbench-kit.samples.jdw.widget-preview',
      ]),
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
