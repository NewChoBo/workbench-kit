import { useEffect, useMemo, useReducer, useRef } from 'react';
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
  const activeTab = useActiveEditorTab();
  const resolvedTabId = tabId ?? activeTab?.id;
  const hostRef = useRef<EditorHost | undefined>(undefined);
  const forceRender = useForceRender();

  const host = useMemo(() => {
    if (!resolvedTabId) {
      hostRef.current = undefined;
      return undefined;
    }

    const nextHost = editorService.createEditorHost(resolvedTabId);
    hostRef.current = nextHost;
    return nextHost;
  }, [editorService, resolvedTabId]);

  useEffect(() => {
    const disposable = editorService.onDidChangeEditors(forceRender);
    return () => {
      disposable.dispose();
    };
  }, [editorService, forceRender]);

  return host;
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
