import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { createCommandRegistryFromContributions } from '@workbench-kit/core';
import { integratedShellWorkspaceFiles } from '@workbench-kit/adapters';
import { Button } from '../primitives/Button';
import { TextInput } from '../primitives/TextInput';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { createWorkbenchShellCommands } from './commands';
import { WorkbenchStandaloneShell } from './WorkbenchStandaloneShell';
import { type WorkbenchStandaloneBootstrap } from './standalone';
import {
  WorkbenchDocumentRenderer,
  createPatchFromWorkbenchDocumentAction,
  initializeWorkbenchDocumentPatchHistory,
  isWorkbenchDocumentSupported,
  type WorkbenchDocument,
  type WorkbenchDocumentPatchHistory,
  type WorkbenchDocumentPatchHistoryState,
  type WorkbenchDocumentPatchResult,
} from './schema';

const DEFAULT_FIGMA_ACTIVITY_ID = 'design';
const DEFAULT_FIGMA_THEME = 'dark';

const defaultDocument: WorkbenchDocument = {
  version: '1.0.0',
  schemaVersion: 1,
  pages: [
    {
      id: 'page-shell-figma',
      name: 'Design',
      width: 1100,
      height: 680,
      background: '#f8fafc',
      nodes: [
        {
          id: 'shell-bg',
          type: 'frame',
          name: 'Canvas frame',
          layout: { x: 20, y: 20, width: 420, height: 240 },
          style: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 12 },
          children: ['shell-title', 'shell-caption'],
        },
        {
          id: 'shell-title',
          type: 'text',
          name: 'Title',
          parentId: 'shell-bg',
          layout: { x: 14, y: 14, width: 300, height: 38 },
          style: { color: '#0f172a', fontSize: 26, fontFamily: 'Arial' },
          content: 'Workbench canvas shell',
        },
        {
          id: 'shell-caption',
          type: 'text',
          name: 'Caption',
          parentId: 'shell-bg',
          layout: { x: 14, y: 62, width: 340, height: 28 },
          style: { color: '#334155', fontSize: 14, fontFamily: 'Arial' },
          content: 'Sidebar tools · canvas editing · json patch history',
        },
        {
          id: 'shell-card',
          type: 'rectangle',
          name: 'Card',
          layout: { x: 500, y: 42, width: 220, height: 140 },
          style: { backgroundColor: '#bfdbfe', borderColor: '#2563eb', borderWidth: 1, borderRadius: 10 },
        },
        {
          id: 'shell-chip',
          type: 'rectangle',
          name: 'Chip',
          layout: { x: 500, y: 220, width: 132, height: 60 },
          style: { backgroundColor: '#bbf7d0', borderColor: '#22c55e', borderWidth: 1, borderRadius: 12 },
        },
      ],
    },
  ],
};

type FigmaShellActivityId = 'design';
type WorkbenchPatchApplyResult = {
  state: WorkbenchDocumentPatchHistoryState;
  result: WorkbenchDocumentPatchResult;
};

export interface WorkbenchFigmaShellProps {
  initialDocument?: WorkbenchDocument;
  initialTheme?: 'light' | 'dark' | (string & {});
  rootClassName?: string;
  rootStyle?: CSSProperties;
  compactStatus?: boolean;
  onDocumentChange?: (document: WorkbenchDocument) => void;
}

export function WorkbenchFigmaShell({
  initialDocument = defaultDocument,
  initialTheme = DEFAULT_FIGMA_THEME,
  rootClassName,
  rootStyle,
  compactStatus = true,
  onDocumentChange,
}: WorkbenchFigmaShellProps) {
  const activities = useMemo(
    () => [
      {
        id: DEFAULT_FIGMA_ACTIVITY_ID,
        label: 'Design',
        icon: 'codicon-layout',
      },
    ],
    [],
  );

  const commandRegistry = useMemo(
    () =>
      createCommandRegistryFromContributions([
        {
          commands: createWorkbenchShellCommands<FigmaShellActivityId>({
            activities,
            includeSettings: false,
          }),
        },
      ]),
    [activities],
  );

  const [history] = useState<WorkbenchDocumentPatchHistory>(() =>
    initializeWorkbenchDocumentPatchHistory(initialDocument),
  );
  const [documentJson, setDocumentJson] = useState<WorkbenchDocument>(initialDocument);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [statusText, setStatusText] = useState('ready');
  const [nameInput, setNameInput] = useState('');
  const [contentInput, setContentInput] = useState('');

  const selectedNode = history.state.present.pages[0]?.nodes.find((node) => node.id === selectedNodeId);
  const activePageId = history.state.present.pages[0]?.id ?? 'page-shell-figma';

  useEffect(() => {
    setNameInput(selectedNode?.name ?? '');
    setContentInput(
      selectedNode?.type === 'text' ? String((selectedNode as { content?: string }).content ?? '') : '',
    );
  }, [selectedNode?.id, documentJson]);

  const applyAction = (action: Parameters<typeof createPatchFromWorkbenchDocumentAction>[0]) => {
    if (!isWorkbenchDocumentSupported(documentJson)) {
      setStatusText('unsupported schema');
      return;
    }

    let patchResult: WorkbenchPatchApplyResult;

    try {
      const nextPatch = createPatchFromWorkbenchDocumentAction(action, documentJson);
      patchResult = history.applyPatch(nextPatch.patch);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'patch failed');
      return;
    }

    setDocumentJson(patchResult.state.present);
    setStatusText(`patch ${patchResult.result.document.version || 'ok'}`);
    onDocumentChange?.(patchResult.state.present);
  };

  const applyMove = (
    nodeId: string,
    layout: WorkbenchDocument['pages'][number]['nodes'][number]['layout'],
  ) => {
    const targetNode = history.state.present.pages[0]?.nodes.find((node) => node.id === nodeId);
    const nextLayout = {
      ...(targetNode?.layout ?? {}),
      ...layout,
    };

    applyAction({
      action: 'replace-layout',
      pageId: activePageId,
      nodeId,
      layout: nextLayout,
    });
  };

  const createNode = (type: 'text' | 'rectangle') => {
    const id = `${type}-${Date.now()}`;
    applyAction({
      action: 'create',
      pageId: activePageId,
      node:
        type === 'text'
          ? {
              id,
              type: 'text',
              name: `${type}-${Date.now()}`,
              layout: {
                x: 40 + Math.random() * 280,
                y: 300 + Math.random() * 180,
                width: 220,
                height: 30,
              },
              style: { fontSize: 14, color: '#0f172a', fontFamily: 'Arial' },
              content: 'Text node',
            }
          : {
              id,
              type: 'rectangle',
              name: `${type}-${Date.now()}`,
              layout: {
                x: 80 + Math.random() * 260,
                y: 300 + Math.random() * 160,
                width: 120,
                height: 80,
              },
              style: { backgroundColor: '#fef08a', borderColor: '#ca8a04', borderWidth: 1, borderRadius: 6 },
            },
    });
  };

  const deleteSelected = () => {
    if (!selectedNodeId) {
      setStatusText('select a node first');
      return;
    }

    applyAction({
      action: 'delete',
      pageId: activePageId,
      nodeId: selectedNodeId,
    });
    setSelectedNodeId(undefined);
  };

  const saveName = () => {
    if (!selectedNodeId) {
      setStatusText('select a node first');
      return;
    }

    applyAction({
      action: 'rename',
      pageId: activePageId,
      nodeId: selectedNodeId,
      name: nameInput || selectedNode?.name || `node-${selectedNodeId}`,
    });
  };

  const saveContent = () => {
    if (!selectedNodeId) {
      setStatusText('select a node first');
      return;
    }

    if (selectedNode?.type !== 'text') {
      setStatusText('selected node is not text');
      return;
    }

    applyAction({
      action: 'replace-content',
      pageId: activePageId,
      nodeId: selectedNodeId,
      content: contentInput,
    });
  };

  const undo = () => {
    const nextState = history.undo();
    if (!nextState) {
      setStatusText('nothing to undo');
      return;
    }

    setDocumentJson(nextState.present);
    onDocumentChange?.(nextState.present);
    setStatusText('undo');
  };

  const redo = () => {
    const nextState = history.redo();
    if (!nextState) {
      setStatusText('nothing to redo');
      return;
    }

    setDocumentJson(nextState.present);
    onDocumentChange?.(nextState.present);
    setStatusText('redo');
  };

  const bootstrap = useMemo<WorkbenchStandaloneBootstrap<FigmaShellActivityId>>(
    () => ({
      contract: {
        activities,
        commandRegistry,
        statusSections: [],
        initialActivityId: DEFAULT_FIGMA_ACTIVITY_ID,
        initialTheme,
      },
      initialFiles: integratedShellWorkspaceFiles,
      workspace: {
        openFile: async () => undefined,
        saveFile: async () => ({
          file: { content: '', path: 'design.tsx' },
          kind: 'save:success',
          outcome: 'unchanged',
        }),
        deleteFiles: async () => undefined,
      },
      chat: {
        onChatSubmit: async () => undefined,
        onCancelChat: () => undefined,
      },
      patch: {
        onPatchApply: async (patch) => ({
          patch,
          type: 'patch:applied',
        }),
      },
      save: {},
      status: {},
    }),
    [activities, commandRegistry, initialTheme],
  );

  return (
    <WorkbenchStandaloneShell<FigmaShellActivityId>
      bootstrap={bootstrap}
      compactStatus={compactStatus}
      maxPrimarySidebarSizePercent={42}
      minPrimarySidebarSizePercent={16}
      getStatusSections={() => [
        {
          id: 'main',
          items: [{ id: 'status', icon: <span className="workbench-status-dot" />, label: statusText }],
        },
      ]}
      renderPrimarySidebar={() => (
        <SideBarViewFrame title="Design Inspector">
          <div style={{ display: 'grid', gap: 8, padding: 8 }}>
            <Button onClick={() => createNode('text')}>Insert text</Button>
            <Button onClick={() => createNode('rectangle')}>Insert rectangle</Button>
            <Button onClick={deleteSelected}>Delete selected</Button>
            <TextInput
              aria-label="node-name"
              controlWidth="full"
              value={nameInput}
              onChange={(event) => setNameInput(event.currentTarget.value)}
            />
            <Button onClick={saveName}>Rename selected</Button>
            {selectedNode?.type === 'text' ? (
              <>
                <TextInput
                  aria-label="node-content"
                  controlWidth="full"
                  value={contentInput}
                  onChange={(event) => setContentInput(event.currentTarget.value)}
                />
                <Button onClick={saveContent}>Update content</Button>
              </>
            ) : null}
            <hr style={{ opacity: 0.2 }} />
            <Button onClick={undo} disabled={!history.canUndo}>
              Undo
            </Button>
            <Button onClick={redo} disabled={!history.canRedo}>
              Redo
            </Button>
          </div>
        </SideBarViewFrame>
      )}
      renderSecondaryArea={() => (
        <main className="workbench-editor-area" style={{ padding: 8 }}>
          <WorkbenchDocumentRenderer
            page={history.state.present.pages[0]}
            selectedNodeId={selectedNodeId}
            onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
            onNodeMove={(nodeId, layout) => applyMove(nodeId, layout)}
            style={{ height: '100%' }}
          />
        </main>
      )}
      rootClassName={rootClassName}
      rootStyle={rootStyle}
    />
  );
}
