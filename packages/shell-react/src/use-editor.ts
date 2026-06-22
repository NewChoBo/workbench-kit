import { useEffect, useMemo, useReducer, useState } from 'react';
import type { EditorHost, EditorService, EditorTabState } from '@workbench-kit/workbench-core';

import { useWorkbench } from './provider.js';
import type { EditorDocumentViewProvider } from './editor-view-providers.js';

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
  const { waitForExtensionStartup } = useWorkbench();
  const editorState = useEditorState();
  const [extensionsReady, setExtensionsReady] = useState(false);
  const activeGroup = editorState.groups.find((group) => group.id === editorState.activeGroupId);
  const resolvedTabId = tabId ?? activeGroup?.activeTabId;
  const resolvedTab = resolvedTabId
    ? editorState.groups.flatMap((group) => group.tabs).find((tab) => tab.id === resolvedTabId)
    : undefined;

  useEffect(() => {
    let cancelled = false;

    void waitForExtensionStartup().then(() => {
      if (!cancelled) {
        setExtensionsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [waitForExtensionStartup]);

  return useMemo(() => {
    if (!resolvedTabId || !extensionsReady) {
      return undefined;
    }

    return editorService.createEditorHost(resolvedTabId);
  }, [
    editorService,
    extensionsReady,
    resolvedTab?.resourceMissing,
    resolvedTab?.resourceUri,
    resolvedTabId,
  ]);
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
