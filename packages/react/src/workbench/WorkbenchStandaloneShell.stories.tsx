import { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { createCommandRegistryFromContributions } from '@workbench-kit/core';
import { integratedShellWorkspaceFiles } from '@workbench-kit/adapters';
import { Button } from '../primitives/Button';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { EmptyState } from '../primitives/EmptyState';
import { TextInput } from '../primitives/TextInput';
import { createWorkbenchShellCommands } from './commands';
import { WorkbenchStandaloneShell } from './WorkbenchStandaloneShell';
import {
  WorkbenchDocumentRenderer,
  createPatchFromWorkbenchDocumentAction,
  isWorkbenchDocumentSupported,
  initializeWorkbenchDocumentPatchHistory,
  type WorkbenchDocument,
  type WorkbenchDocumentAction,
  type WorkbenchDocumentPatchHistoryState,
  type WorkbenchDocumentPatchResult,
} from './index';
import type { WorkbenchStandaloneBootstrap } from './standalone';
import { StatusBar, type StatusBarSectionModel } from './StatusBar';

const meta = {
  title: 'React/Workbench/Shell/Standalone',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;
type WorkbenchPatchApplyResult = {
  state: WorkbenchDocumentPatchHistoryState;
  result: WorkbenchDocumentPatchResult;
};

type DemoActivityId = 'explorer' | 'search';

const demoActivities = [
  { id: 'explorer' as const, label: 'Explorer', icon: 'codicon-files' },
  { id: 'search' as const, label: 'Search', icon: 'codicon-search' },
];

const demoStatusSections: StatusBarSectionModel[] = [
  {
    id: 'main',
    items: [
      { id: 'status', icon: <span className="workbench-status-dot" />, label: 'Standalone shell' },
    ],
  },
];

const figmaShellDocument: WorkbenchDocument = {
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

const figmaShellActivities = [{ id: 'design' as const, label: 'Design', icon: 'codicon-layout' }];
type FigmaShellActivityId = (typeof figmaShellActivities)[number]['id'];

function FigmaShellWorkbenchPreview() {
  const [history] = useState(() => initializeWorkbenchDocumentPatchHistory(figmaShellDocument));
  const [documentJson, setDocumentJson] = useState<WorkbenchDocument>(figmaShellDocument);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [statusText, setStatusText] = useState('ready');
  const [nameInput, setNameInput] = useState('');
  const [contentInput, setContentInput] = useState('');

  const selectedNode = useMemo(
    () => history.state.present.pages[0]?.nodes.find((node) => node.id === selectedId),
    [history.state.present, selectedId],
  );

  useEffect(() => {
    setNameInput(selectedNode?.name ?? '');
    setContentInput(selectedNode?.type === 'text' ? String((selectedNode as { content?: string }).content ?? '') : '');
  }, [selectedNode]);

  const applyAction = (action: WorkbenchDocumentAction) => {
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
  };

  const applyMove = (nodeId: string, layout: WorkbenchDocument['pages'][number]['nodes'][number]['layout']) => {
    const targetNode = history.state.present.pages[0]?.nodes.find((node) => node.id === nodeId);
    const nextLayout = {
      ...(targetNode?.layout ?? {}),
      ...layout,
    };
    applyAction({
      action: 'replace-layout',
      pageId: 'page-shell-figma',
      nodeId,
      layout: nextLayout,
    });
  };

  const createNode = (type: 'text' | 'rectangle') => {
    const id = `${type}-${Date.now()}`;
    applyAction({
      action: 'create',
      pageId: 'page-shell-figma',
      node: type === 'text'
        ? {
            id,
            type: 'text',
            name: `${type}-${Date.now()}`,
            layout: { x: 40 + Math.random() * 280, y: 300 + Math.random() * 180, width: 220, height: 30 },
            style: { fontSize: 14, color: '#0f172a', fontFamily: 'Arial' },
            content: 'Text node',
          }
        : {
            id,
            type: 'rectangle',
            name: `${type}-${Date.now()}`,
            layout: { x: 80 + Math.random() * 260, y: 300 + Math.random() * 160, width: 120, height: 80 },
            style: { backgroundColor: '#fef08a', borderColor: '#ca8a04', borderWidth: 1, borderRadius: 6 },
          },
    });
  };

  const deleteSelected = () => {
    if (!selectedId) {
      setStatusText('select a node first');
      return;
    }
    applyAction({
      action: 'delete',
      pageId: 'page-shell-figma',
      nodeId: selectedId,
    });
    setSelectedId(undefined);
  };

  const saveName = () => {
    if (!selectedId) {
      setStatusText('select a node first');
      return;
    }
    applyAction({
      action: 'rename',
      pageId: 'page-shell-figma',
      nodeId: selectedId,
      name: nameInput || selectedNode?.name || `node-${selectedId}`,
    });
  };

  const saveContent = () => {
    if (!selectedId) {
      setStatusText('select a node first');
      return;
    }
    if (selectedNode?.type !== 'text') {
      setStatusText('selected node is not text');
      return;
    }
    applyAction({
      action: 'replace-content',
      pageId: 'page-shell-figma',
      nodeId: selectedId,
      content: contentInput,
    });
  };

  const bootstrap = useMemo(
    (): WorkbenchStandaloneBootstrap<FigmaShellActivityId> => ({
      contract: {
        activities: figmaShellActivities,
        commandRegistry: createCommandRegistryFromContributions([
          { commands: createWorkbenchShellCommands({ activities: figmaShellActivities, includeSettings: false }) },
        ]),
        initialActivityId: 'design',
        initialTheme: 'dark',
        statusSections: [],
      },
      initialFiles: integratedShellWorkspaceFiles,
      workspace: {
        openFile: async () => undefined,
        saveFile: async () => ({
          file: { content: '', path: 'readme.md' },
          kind: 'save:success' as const,
          outcome: 'unchanged' as const,
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
          type: 'patch:applied' as const,
        }),
      },
      save: {},
      status: {},
    }),
    [],
  );

  return (
    <WorkbenchStandaloneShell<FigmaShellActivityId>
      bootstrap={bootstrap}
      getStatusSections={() => [
        {
          id: 'main',
          items: [{ id: 'status', icon: <span className="workbench-status-dot" />, label: statusText }],
        },
      ]}
      minPrimarySidebarSizePercent={16}
      maxPrimarySidebarSizePercent={42}
      renderPrimarySidebar={() => (
        <SideBarViewFrame title="Design Inspector">
          <div style={{ display: 'grid', gap: 8, padding: 12 }}>
            <Button onClick={() => createNode('text')}>Insert text</Button>
            <Button onClick={() => createNode('rectangle')}>Insert rectangle</Button>
            <Button onClick={deleteSelected}>Delete selected</Button>
            <hr style={{ opacity: 0.2 }} />
            <label style={{ color: 'var(--color-text)' }}>Selected node id</label>
            <div style={{ color: 'var(--color-text-muted)' }}>{selectedNode?.id ?? 'none'}</div>
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
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-subtle)' }}>
              Undo/redo: use shell history panel buttons in bottom panel.
            </p>
            <Button
              onClick={() => {
                const nextState = history.undo();
                if (!nextState) {
                  setStatusText('nothing to undo');
                  return;
                }
                setDocumentJson(nextState.present);
                setStatusText('undo');
              }}
              disabled={!history.canUndo}
            >
              Undo
            </Button>
            <Button
              onClick={() => {
                const nextState = history.redo();
                if (!nextState) {
                  setStatusText('nothing to redo');
                  return;
                }
                setDocumentJson(nextState.present);
                setStatusText('redo');
              }}
              disabled={!history.canRedo}
            >
              Redo
            </Button>
          </div>
        </SideBarViewFrame>
      )}
      renderSecondaryArea={() => (
        <main className="workbench-editor-area" style={{ padding: 8 }}>
          <WorkbenchDocumentRenderer
            page={history.state.present.pages[0]}
            context={{ selectedNodeIds: selectedId ? [selectedId] : [] }}
            onNodeClick={(nodeId) => {
              setSelectedId(nodeId);
              setStatusText(`selected ${nodeId}`);
            }}
            onNodeMove={(nodeId, layout) => applyMove(nodeId, layout)}
            style={{ height: '100%' }}
          />
        </main>
      )}
      rootClassName="ide-root"
      rootStyle={{ height: '100%', minHeight: 0 }}
    />
  );
}

function StandaloneShellPreview() {
  const bootstrap = useMemo(
    (): WorkbenchStandaloneBootstrap<DemoActivityId> => ({
      contract: {
        activities: demoActivities,
        commandRegistry: createCommandRegistryFromContributions([
          { commands: createWorkbenchShellCommands({ activities: demoActivities }) },
        ]),
        initialActivityId: 'explorer',
        initialTheme: 'dark',
        statusSections: demoStatusSections,
      },
      initialFiles: integratedShellWorkspaceFiles,
      workspace: {
        openFile: async () => undefined,
        saveFile: async () => ({
          file: { content: '', path: 'demo.ts' },
          kind: 'save:success' as const,
          outcome: 'unchanged' as const,
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
          type: 'patch:applied' as const,
        }),
      },
      save: {},
      status: {},
    }),
    [],
  );

  return (
    <WorkbenchStandaloneShell<DemoActivityId>
      bootstrap={bootstrap}
      renderPrimarySidebar={() => (
        <SideBarViewFrame title="Explorer">
          <EmptyState icon="codicon-layout-sidebar-left">
            Primary sidebar slot — host apps supply explorer, search, or other activity views.
          </EmptyState>
        </SideBarViewFrame>
      )}
      renderSecondaryArea={() => (
        <EmptyState icon="codicon-edit">
          Secondary area slot — editor, chat, or settings content is rendered here.
        </EmptyState>
      )}
    />
  );
}

export const Default: Story = {
  render: () => <StandaloneShellPreview />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    await expect(canvas.getByText('Primary sidebar slot')).toBeVisible();
    await expect(canvas.getByLabelText('Status bar')).toHaveTextContent('Standalone shell');
  },
};

export const StatusFooterOnly: Story = {
  render: () => (
    <div style={{ width: '100%', background: 'var(--color-bg)' }}>
      <StatusBar compact sections={demoStatusSections} />
    </div>
  ),
};

export const FigmaWorkbenchShell: Story = {
  render: () => <FigmaShellWorkbenchPreview />,
  name: 'Workbench Studio(Figma MCP)',
};
