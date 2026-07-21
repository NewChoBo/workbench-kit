import { describe, expect, it } from 'vitest';

import type { ViewHost, ViewProvider } from '@workbench-kit/workbench-extension-sdk';
import { DEFAULT_VIEW_HOST_FACTORY_ID } from '@workbench-kit/workbench-extension-sdk';

import {
  createDefaultViewHostFactory,
  createEditorHostFactoryRegistry,
  createViewHostFactoryRegistry,
  EditorHostFactoryRegistry,
  ViewHostFactoryRegistry,
} from './host-factory-registry.js';

function createProvider(renderValue: string): ViewProvider {
  return {
    viewId: 'workbench-kit.test.view',
    resolveViewHost: () =>
      ({
        dispose() {},
        render: () => renderValue,
      }) satisfies ViewHost,
  };
}

describe('ViewHostFactoryRegistry', () => {
  it('uses the default provider-backed factory', () => {
    const registry = createViewHostFactoryRegistry();
    const provider = createProvider('default-host');

    const host = registry.createViewHost({
      viewId: provider.viewId,
      provider,
    });

    expect(host.render()).toBe('default-host');
    expect(registry.getFactories().map((factory) => factory.id)).toEqual([
      DEFAULT_VIEW_HOST_FACTORY_ID,
    ]);
  });

  it('selects the highest-priority matching factory', () => {
    const registry = new ViewHostFactoryRegistry();
    registry.register(createDefaultViewHostFactory());
    registry.register({
      id: 'custom-view-host',
      priority: 10,
      canCreate: ({ viewId }) => viewId.endsWith('.custom'),
      create: () => ({
        dispose() {},
        render: () => 'custom-host',
      }),
    });

    const provider = createProvider('ignored');

    expect(
      registry
        .createViewHost({
          viewId: 'workbench-kit.test.custom',
          provider,
        })
        .render(),
    ).toBe('custom-host');

    expect(
      registry
        .createViewHost({
          viewId: 'workbench-kit.test.standard',
          provider,
        })
        .render(),
    ).toBe('ignored');
  });

  it('hard-fails duplicate factory IDs', () => {
    const registry = new ViewHostFactoryRegistry();
    registry.register(createDefaultViewHostFactory());

    expect(() => registry.register(createDefaultViewHostFactory())).toThrow(
      `View host factory "${DEFAULT_VIEW_HOST_FACTORY_ID}" is already registered.`,
    );
  });
});

describe('EditorHostFactoryRegistry', () => {
  it('returns undefined when no factory is registered', () => {
    const registry = createEditorHostFactoryRegistry();

    expect(
      registry.createEditorHost({
        editorId: 'workbench.editor',
        resourceUri: 'workspace://file/src/app.ts',
      }),
    ).toBeUndefined();
  });

  it('creates editor hosts through registered factories', () => {
    const registry = new EditorHostFactoryRegistry();
    registry.register({
      id: 'test-editor-host',
      create: () => ({
        dispose() {},
        render: () => 'editor-host',
      }),
    });

    expect(
      registry
        .createEditorHost({
          editorId: 'workbench.editor',
          resourceUri: 'workspace://file/src/app.ts',
        })
        ?.render(),
    ).toBe('editor-host');
  });
});
