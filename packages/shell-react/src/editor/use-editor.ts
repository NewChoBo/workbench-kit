import { useEffect, useMemo, useReducer } from 'react';
import type { EditorHost, EditorService, EditorTabState } from '@workbench-kit/workbench-core';

import { useWorkbench } from '../shell/provider.js';
import type { EditorDocumentViewProvider } from './view-providers.js';

export function useEditorService(): EditorService {
  return useWorkbench().editorService;
}

export function useEditorState(): ReturnType<EditorService['getState']> {
  const editorService = useEditorService();
  const forceRender = useForceRender();

  useEffect(() => {
    const disposable = editorService.onDidChangeEditors(forceRender);
    return () => {
      disposable.dispose();
    };
  }, [editorService, forceRender]);

  return editorService.getState();
}

export function useActiveEditorTab(): EditorTabState | undefined {
  const editorService = useEditorService();
  const forceRender = useForceRender();

  useEffect(() => {
    const disposable = editorService.onDidChangeEditors(forceRender);
    return () => {
      disposable.dispose();
    };
  }, [editorService, forceRender]);

  return editorService.getActiveTab();
}

export function useEditorHost(tabId?: string): EditorHost | undefined {
  const editorService = useEditorService();
  const { extensionRegistry, waitForExtensionStartup } = useWorkbench();
  const editorState = useEditorState();
  const forceRender = useForceRender();
  const activeGroup = editorState.groups.find((group) => group.id === editorState.activeGroupId);
  const resolvedTabId = tabId ?? activeGroup?.activeTabId;

  useEffect(() => {
    const disposable = editorService.onDidChangeEditors(forceRender);
    return () => {
      disposable.dispose();
    };
  }, [editorService, forceRender]);

  useEffect(() => {
    let cancelled = false;

    void waitForExtensionStartup().then(() => {
      if (!cancelled) {
        forceRender();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [forceRender, waitForExtensionStartup]);

  useEffect(() => {
    // Late onView / onCommand activations register editor host factories after the
    // first paint that restores persisted tabs. Retry host creation when they land.
    const disposable = extensionRegistry.onDidActivateExtension(forceRender);
    return () => {
      disposable.dispose();
    };
  }, [extensionRegistry, forceRender]);

  if (!resolvedTabId) {
    return undefined;
  }

  // Do not memoize createEditorHost — a failed lookup before factory registration
  // must be retried after extension activation / startup re-renders.
  // EditorService already caches successful hosts per tab id.
  return editorService.createEditorHost(resolvedTabId);
}

export function useEditorDocumentViewProviders(
  localProviders?: readonly EditorDocumentViewProvider[] | undefined,
): readonly EditorDocumentViewProvider[] {
  const { editorDocumentViewProviders } = useWorkbench();
  const forceRender = useForceRender();

  useEffect(() => {
    const disposable = editorDocumentViewProviders.onDidChangeProviders(forceRender);
    return () => {
      disposable.dispose();
    };
  }, [editorDocumentViewProviders, forceRender]);

  const registryProviders = editorDocumentViewProviders.getProviders();

  return useMemo(
    () =>
      localProviders && localProviders.length > 0
        ? [...localProviders, ...registryProviders]
        : registryProviders,
    [localProviders, registryProviders],
  );
}

function useForceRender() {
  const [, forceRender] = useReducer((count: number) => count + 1, 0);
  return forceRender;
}
