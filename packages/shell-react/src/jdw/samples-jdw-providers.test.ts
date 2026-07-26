import { describe, expect, it } from 'vitest';
import { ExtensionRegistry, SAMPLE_WORKBENCH_EXTENSIONS } from '@workbench-kit/workbench-core';

describe('samples.jdw document view providers', () => {
  it('registers form and preview providers on startup activation', async () => {
    const extension = SAMPLE_WORKBENCH_EXTENSIONS.find(
      (candidate) => candidate.manifest.id === 'workbench-kit.samples.jdw',
    );
    expect(extension).toBeDefined();

    const registry = new ExtensionRegistry();
    registry.registerExtension(extension!);
    await registry.activateStartup();

    const providers = registry.editorDocumentViews.getProviders();
    expect(providers.map((provider) => provider.id).sort()).toEqual([
      'workbench-kit.samples.jdw.widget-form',
      'workbench-kit.samples.jdw.widget-preview',
    ]);

    const document = {
      content: '{"type":"text"}',
      mimeType: 'application/vnd.workbench-kit.jdw+json',
      path: 'widget.jdw.json',
      resourceUri: 'workspace://file/widget.jdw.json',
    };

    expect(providers.every((provider) => provider.matches?.(document) === true)).toBe(true);
  });
});
