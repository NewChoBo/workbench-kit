import { type CSSProperties, type ReactElement, useEffect, useMemo, useState } from 'react';
import { createCommandRegistryFromContributions } from '@workbench-kit/core';
import { integratedShellWorkspaceFiles } from '@workbench-kit/adapters';
import { Button } from '../primitives/Button';
import { TextInput } from '../primitives/TextInput';
import { SideBarViewFrame } from '../layout/SideBarViewFrame';
import { createWorkbenchShellCommands } from './commands';
import { WorkbenchStandaloneShell } from './WorkbenchStandaloneShell';
import type { WorkbenchActivityDescriptor, WorkbenchStandaloneBootstrap } from './standalone';
import {
  WorkbenchDocumentRenderer,
  createPatchFromWorkbenchDocumentAction,
  initializeWorkbenchDocumentPatchHistory,
  isWorkbenchDocumentSupported,
  type WorkbenchDocument,
  type WorkbenchDocumentNode,
  type WorkbenchDocumentPatch,
  type WorkbenchDocumentPatchHistory,
  type WorkbenchDocumentPatchHistoryState,
  type WorkbenchDocumentPatchResult,
} from './schema';

const DEFAULT_CANVAS_ACTIVITY_ID = 'design';
const DEFAULT_CANVAS_THEME = 'dark';

type StudioShellTab = 'source' | 'preview' | 'window' | 'layout' | 'tile' | 'layer';

type StudioShellActivityId = 'design';

type WorkbenchPatchApplyResult = {
  state: WorkbenchDocumentPatchHistoryState;
  result: WorkbenchDocumentPatchResult;
};

const placeholderImageSrc = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs><rect width="320" height="180" fill="url(%23g)"/><text x="50%" y="52%" fill="white" font-size="24" text-anchor="middle" font-family="Arial">Image Layer</text></svg>'
)}`

const defaultDocument: WorkbenchDocument = {
  version: '1.0.0',
  schemaVersion: 1,
  pages: [
    {
      id: 'page-shell-canvas',
      name: 'Design',
      width: 1280,
      height: 760,
      background: '#1f2937',
      nodes: [
        {
          id: 'shell-frame',
          type: 'frame',
          name: 'Window',
          layout: { x: 80, y: 60, width: 980, height: 560 },
          style: {
            backgroundColor: '#0f172a',
            borderColor: '#475569',
            borderWidth: 1,
            borderRadius: 12,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
          },
          children: ['tile-1', 'tile-2', 'tile-3'],
        },
        {
          id: 'tile-1',
          type: 'frame',
          name: 'Tile: Header',
          parentId: 'shell-frame',
          layout: { x: 22, y: 18, width: 300, height: 180 },
          style: {
            backgroundColor: '#0ea5e9',
            borderRadius: 10,
            borderColor: '#0284c7',
            borderWidth: 1,
          },
          children: ['tile-1-image', 'tile-1-text'],
        },
        {
          id: 'tile-1-image',
          type: 'image',
          name: 'Image Layer',
          parentId: 'tile-1',
          layout: { x: 12, y: 12, width: 126, height: 90 },
          src: placeholderImageSrc,
          style: {
            borderRadius: 8,
            borderColor: '#0c4a6e',
            borderWidth: 1,
          },
        },
        {
          id: 'tile-1-text',
          type: 'text',
          name: 'Text Layer',
          parentId: 'tile-1',
          layout: { x: 146, y: 36, width: 140, height: 80 },
          content: 'Tile title',
          style: {
            color: '#f8fafc',
            fontSize: 20,
            fontFamily: 'Inter, "Segoe UI", sans-serif',
            fontWeight: 700,
          },
        },
        {
          id: 'tile-2',
          type: 'rectangle',
          name: 'Action Tile',
          parentId: 'shell-frame',
          layout: { x: 336, y: 18, width: 280, height: 180 },
          style: {
            backgroundColor: '#7c3aed',
            borderRadius: 10,
            borderColor: '#6d28d9',
            borderWidth: 1,
            boxShadow: '0 8px 20px rgba(88, 28, 135, 0.45)',
          },
        },
        {
          id: 'tile-3',
          type: 'rectangle',
          name: 'Action Tile 2',
          parentId: 'shell-frame',
          layout: { x: 632, y: 18, width: 280, height: 180 },
          style: {
            backgroundColor: '#f59e0b',
            borderRadius: 10,
            borderColor: '#d97706',
            borderWidth: 1,
          },
        },
      ],
    },
  ],
};

export interface WorkbenchCanvasShellProps {
  initialDocument?: WorkbenchDocument;
  initialTheme?: 'light' | 'dark' | (string & {});
  rootClassName?: string;
  rootStyle?: CSSProperties;
  compactStatus?: boolean;
  onDocumentChange?: (document: WorkbenchDocument) => void;
}

export function WorkbenchCanvasShell({
  initialDocument = defaultDocument,
  initialTheme = DEFAULT_CANVAS_THEME,
  rootClassName,
  rootStyle,
  compactStatus = true,
  onDocumentChange,
}: WorkbenchCanvasShellProps) {
  const activities = useMemo<Array<WorkbenchActivityDescriptor<StudioShellActivityId>>>(() => [
    {
      id: DEFAULT_CANVAS_ACTIVITY_ID,
      label: 'Design',
      icon: 'codicon-layout',
    },
  ], []);

  const commandRegistry = useMemo(
    () =>
      createCommandRegistryFromContributions([
        {
          commands: createWorkbenchShellCommands<StudioShellActivityId>({
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
  const [srcInput, setSrcInput] = useState('');
  const [bgColorInput, setBgColorInput] = useState('');
  const [borderColorInput, setBorderColorInput] = useState('');
  const [textColorInput, setTextColorInput] = useState('');
  const [layoutXInput, setLayoutXInput] = useState('');
  const [layoutYInput, setLayoutYInput] = useState('');
  const [layoutWInput, setLayoutWInput] = useState('');
  const [layoutHInput, setLayoutHInput] = useState('');
  const [sourceText, setSourceText] = useState(() => JSON.stringify(initialDocument, null, 2));
  const [activeTab, setActiveTab] = useState<StudioShellTab>('preview');

  const activePageId = documentJson.pages?.[0]?.id ?? 'page-shell-canvas';
  const activePage = documentJson.pages.find(
    (page: WorkbenchDocument['pages'][number]) => page.id === activePageId,
  ) ?? documentJson.pages[0];
  const selectedNode = activePage?.nodes.find((node: WorkbenchDocumentNode) => node.id === selectedNodeId);

  const nodeLookup = useMemo(() => {
    const map = new Map<string, WorkbenchDocumentNode>();
    for (const node of activePage?.nodes ?? []) {
      map.set(node.id, node);
    }
    return map;
  }, [activePage?.nodes]);

  const rootNodeIds = useMemo(() => {
      const childIdSet = new Set(
      activePage?.nodes.flatMap((node: WorkbenchDocumentNode) => {
        const nodeChildren = 'children' in node ? (node as { children?: readonly string[] }).children : undefined;
        return nodeChildren ?? [];
      }) ?? [],
    );
    return activePage?.nodes
      .filter((node: WorkbenchDocumentNode) => !node.parentId && !childIdSet.has(node.id))
      .map((node: WorkbenchDocumentNode) => node.id) ?? [];
  }, [activePage?.nodes]);

  useEffect(() => {
    setSourceText(JSON.stringify(documentJson, null, 2));
  }, [documentJson]);

  useEffect(() => {
    setNameInput(selectedNode?.name ?? '');
    setContentInput(selectedNode?.type === 'text' ? String((selectedNode as { content?: string }).content ?? '') : '');
    setSrcInput(selectedNode?.type === 'image' ? String((selectedNode as { src?: string }).src ?? '') : '');
    setBgColorInput(String(selectedNode?.style?.backgroundColor ?? ''));
    setBorderColorInput(String(selectedNode?.style?.borderColor ?? ''));
    setTextColorInput(String(selectedNode?.style?.color ?? ''));
    setLayoutXInput(
      selectedNode?.layout?.x === undefined ? '' : String(selectedNode.layout.x),
    );
    setLayoutYInput(
      selectedNode?.layout?.y === undefined ? '' : String(selectedNode.layout.y),
    );
    setLayoutWInput(
      selectedNode?.layout?.width === undefined ? '' : String(selectedNode.layout.width),
    );
    setLayoutHInput(
      selectedNode?.layout?.height === undefined ? '' : String(selectedNode.layout.height),
    );
  }, [
    selectedNode?.id,
    selectedNode?.name,
    selectedNode?.style?.backgroundColor,
    selectedNode?.style?.borderColor,
    selectedNode?.style?.color,
    selectedNode?.layout?.x,
    selectedNode?.layout?.y,
    selectedNode?.layout?.width,
    selectedNode?.layout?.height,
  ]);

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

  const applyDocumentPatch = (patch: WorkbenchDocumentPatch) => {
    try {
      const patchResult = history.applyPatch(patch);
      setDocumentJson(patchResult.state.present);
      setStatusText(`source patch ${patchResult.state.present.version || 'applied'}`);
      onDocumentChange?.(patchResult.state.present);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'source patch failed');
    }
  };

  const applyMove = (
    nodeId: string,
    layout: WorkbenchDocument['pages'][number]['nodes'][number]['layout'],
  ) => {
    const targetNode = history.state.present.pages[0]?.nodes.find((node: WorkbenchDocumentNode) => node.id === nodeId);
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

  const createNode = (type: 'text' | 'rectangle' | 'image') => {
    const randomSeed = Math.floor(Math.random() * 10000);
    const id = `${type}-${Date.now()}-${randomSeed}`;
    const baseLayout = {
      x: 110 + Math.random() * 680,
      y: 220 + Math.random() * 220,
      width: 220,
      height: 120,
    };

    if (type === 'text') {
      applyAction({
        action: 'create',
        pageId: activePageId,
        node: {
          id,
          type: 'text',
          name: `Text ${randomSeed}`,
          layout: baseLayout,
          style: {
            fontSize: 14,
            color: '#f8fafc',
            fontFamily: 'Inter, "Segoe UI", sans-serif',
          },
          content: 'Text node',
        },
      });
      return;
    }

    if (type === 'image') {
      applyAction({
        action: 'create',
        pageId: activePageId,
        node: {
          id,
          type: 'image',
          name: `Image ${randomSeed}`,
          layout: { ...baseLayout, height: 96 },
          style: {
            borderRadius: 6,
            borderColor: '#94a3b8',
            borderWidth: 1,
          },
          src: placeholderImageSrc,
        },
      });
      return;
    }

    applyAction({
      action: 'create',
      pageId: activePageId,
      node: {
        id,
        type: 'rectangle',
        name: `Rectangle ${randomSeed}`,
        layout: baseLayout,
        style: {
          backgroundColor: '#facc15',
          borderColor: '#ca8a04',
          borderWidth: 1,
          borderRadius: 6,
        },
      },
    });
  };

  const renameNode = (nextName: string) => {
    if (!selectedNodeId || !selectedNode) {
      setStatusText('select a node first');
      return;
    }

    applyAction({
      action: 'rename',
      pageId: activePageId,
      nodeId: selectedNodeId,
      name: nextName || selectedNode.name,
    });
  };

  const saveText = () => {
    if (!selectedNodeId || !selectedNode || selectedNode.type !== 'text') {
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

  const saveImageSrc = () => {
    if (!selectedNodeId || !selectedNode || selectedNode.type !== 'image') {
      setStatusText('selected node is not image');
      return;
    }

    applyAction({
      action: 'replace',
      pageId: activePageId,
      nodeId: selectedNodeId,
      node: {
        ...selectedNode,
        src: srcInput,
      },
    });
  };

  const saveStyle = () => {
    if (!selectedNodeId || !selectedNode) {
      setStatusText('select a node first');
      return;
    }

    applyAction({
      action: 'replace-style',
      pageId: activePageId,
      nodeId: selectedNodeId,
      style: {
        ...(selectedNode.style ?? {}),
        ...(bgColorInput ? { backgroundColor: bgColorInput } : {}),
        ...(borderColorInput ? { borderColor: borderColorInput } : {}),
        ...(selectedNode.type === 'text' && textColorInput ? { color: textColorInput } : {}),
      },
    });
  };

  const saveLayout = () => {
    if (!selectedNodeId || !selectedNode) {
      setStatusText('select a node first');
      return;
    }
    const parseNumber = (value: string) => {
      const trimmed = value.trim();
      const n = Number(trimmed);
      if (trimmed === '' || !Number.isFinite(n)) {
        return undefined;
      }
      return n;
    };

    const nextLayout = {
      ...(selectedNode.layout ?? {}),
      ...(parseNumber(layoutXInput) !== undefined ? { x: parseNumber(layoutXInput) } : {}),
      ...(parseNumber(layoutYInput) !== undefined ? { y: parseNumber(layoutYInput) } : {}),
      ...(parseNumber(layoutWInput) !== undefined ? { width: parseNumber(layoutWInput) } : {}),
      ...(parseNumber(layoutHInput) !== undefined ? { height: parseNumber(layoutHInput) } : {}),
    };

    applyAction({
      action: 'replace-layout',
      pageId: activePageId,
      nodeId: selectedNodeId,
      layout: nextLayout,
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

  const applySourcePatch = () => {
    let nextDocument: unknown;
    try {
      nextDocument = JSON.parse(sourceText);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'invalid JSON');
      return;
    }

    if (!isWorkbenchDocumentSupported(nextDocument as WorkbenchDocument)) {
      setStatusText('source patch requires schemaVersion 1');
      return;
    }

    const patch: WorkbenchDocumentPatch = {
      id: `source-${Date.now()}`,
      schemaVersion: (nextDocument as WorkbenchDocument).schemaVersion,
      timestamp: new Date().toISOString(),
      ops: [
        {
          op: 'replace',
          path: '',
          value: nextDocument as WorkbenchDocument,
        },
      ],
    };
    applyDocumentPatch(patch);
  };

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab('layer');
  };

  const renderNodeRow = (nodeId: string, depth: number): Array<ReactElement | null> => {
    const node = nodeLookup.get(nodeId);
    if (!node) {
      return [];
    }

    const children = 'children' in node ? ((node as { children?: readonly string[] }).children ?? []) : [];
    const isSelected = node.id === selectedNodeId;
    const prefix = `${'\u00a0'.repeat(Math.max(depth - 1, 0) * 2)}${depth > 0 ? '↳ ' : ''}`;

    const row = (
      <button
        key={node.id}
        onClick={() => selectNode(node.id)}
        style={{
          width: '100%',
          textAlign: 'left',
          border: 'none',
          color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
          background: isSelected ? 'rgba(59, 130, 246, 0.35)' : 'transparent',
          padding: '6px 8px',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: isSelected ? 600 : 400,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 16, textAlign: 'center', opacity: 0.8 }}>
          {node.type === 'frame'
            ? '▣'
            : node.type === 'text'
              ? '✎'
              : node.type === 'image'
                ? '◻'
                : '▭'}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {prefix}
          {node.name}
        </span>
      </button>
    );

    return [
      row,
      ...children.flatMap((childId: string) => renderNodeRow(childId, depth + 1)),
    ];
  };

  const bootstrap = useMemo<WorkbenchStandaloneBootstrap<StudioShellActivityId>>(
    () => ({
      contract: {
        activities,
        commandRegistry,
        statusSections: [],
        initialActivityId: DEFAULT_CANVAS_ACTIVITY_ID,
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
        onCancelChat: async () => undefined,
      },
      save: {},
      patch: {
        onPatchApply: async (patch) => ({
          patch,
          type: 'patch:applied',
        }),
      },
      status: {},
    }),
    [activities, commandRegistry, initialTheme],
  );

  const tabItems: Array<{ id: StudioShellTab; label: string }> = [
    { id: 'source', label: 'Source' },
    { id: 'preview', label: 'Preview' },
    { id: 'window', label: 'Window' },
    { id: 'layout', label: 'Layout' },
    { id: 'tile', label: 'Tile' },
    { id: 'layer', label: 'Layer' },
  ];

  const sectionBlockStyle: CSSProperties = {
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    display: 'grid',
    gap: 8,
    background: 'rgba(15, 23, 42, 0.25)',
  };

  return (
      <WorkbenchStandaloneShell<StudioShellActivityId>
      bootstrap={bootstrap}
      compactStatus={compactStatus}
      maxPrimarySidebarSizePercent={44}
      minPrimarySidebarSizePercent={18}
      getStatusSections={() => [
        {
          id: 'main',
          items: [
            { id: 'status', icon: <span className="workbench-status-dot" />, label: statusText },
            { id: 'document', label: `nodes: ${activePage?.nodes.length ?? 0}` },
            { id: 'selected', label: selectedNode ? `selected: ${selectedNode.name}` : 'selected: none' },
          ],
        },
        {
          id: 'tab',
          items: [{ id: 'tab', label: `tab: ${activeTab}` }],
        },
      ]}
      renderPrimarySidebar={() => (
        <SideBarViewFrame title="Launchpad Explorer">
          <div style={{ padding: 8, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextInput controlWidth="full" placeholder="Search layer" />
              <Button onClick={() => createNode('text')} compact variant="primary">
                +T
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => createNode('rectangle')} compact>
                +Rect
              </Button>
              <Button onClick={() => createNode('image')} compact>
                +Img
              </Button>
            </div>
            <div style={sectionBlockStyle}>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>Layers</div>
              <div style={{ display: 'grid' }}>
                {rootNodeIds.flatMap((nodeId: string) => renderNodeRow(nodeId, 0))}
              </div>
            </div>
            <div style={sectionBlockStyle}>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>Editor</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <Button
                  onClick={() => {
                    if (selectedNodeId) {
                      setActiveTab('layer');
                    }
                  }}
                  compact
                  disabled={!selectedNodeId}
                >
                  Inspector Focus
                </Button>
                <Button onClick={undo} compact disabled={!history.canUndo}>
                  Undo
                </Button>
                <Button onClick={redo} compact disabled={!history.canRedo}>
                  Redo
                </Button>
                <Button onClick={deleteSelected} compact disabled={!selectedNodeId} variant="danger">
                  Delete selected
                </Button>
              </div>
            </div>
          </div>
        </SideBarViewFrame>
      )}
      renderSecondaryArea={() => (
        <div style={{ display: 'grid', gridTemplateRows: '34px 1fr', height: '100%' }}>
          <div
            style={{
              height: 34,
              borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
              display: 'flex',
              gap: 2,
              padding: '4px',
              background: 'rgba(15, 23, 42, 0.24)',
            }}
          >
            {tabItems.map((tab) => (
              <Button
                compact
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'default'}
                onClick={() => setActiveTab(tab.id)}
                style={{ lineHeight: 1 }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <main
              style={{
                flex: 1,
                padding: 8,
                minWidth: 0,
                display: 'grid',
                gridTemplateRows: '1fr',
                position: 'relative',
              }}
            >
              {activeTab === 'source' ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button onClick={applySourcePatch} compact variant="primary">
                      Apply JSON
                    </Button>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Editing document source</span>
                  </div>
                  <textarea
                    value={sourceText}
                    onChange={(event) => setSourceText(event.currentTarget.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      resize: 'none',
                      background: '#020617',
                      color: '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: 8,
                      padding: 10,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 12,
                      lineHeight: 1.35,
                    }}
                  />
                </div>
              ) : (
                <WorkbenchDocumentRenderer
                  page={activePage ?? history.state.present.pages[0]}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
                  onNodeMove={(nodeId, layout) => applyMove(nodeId, layout)}
                  style={{ height: '100%', width: '100%', background: '#1e293b' }}
                />
              )}
            </main>
            <aside
              style={{
                width: 340,
                borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
                padding: 8,
                display: 'grid',
                gap: 8,
                overflow: 'auto',
                background: 'rgba(15, 23, 42, 0.4)',
              }}
            >
              <div style={sectionBlockStyle}>
                <div style={{ fontWeight: 600 }}>Window / Workspace</div>
                <TextInput
                  aria-label="node-name"
                  controlWidth="full"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.currentTarget.value)}
                  placeholder="name"
                />
                <Button onClick={() => renameNode(nameInput)} compact>
                  Rename
                </Button>
              </div>
              <div style={sectionBlockStyle}>
                <div style={{ fontWeight: 600 }}>Layout</div>
                <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 6, alignItems: 'center' }}>
                  <label>X</label>
                  <TextInput controlWidth="full" value={layoutXInput} onChange={(event) => setLayoutXInput(event.currentTarget.value)} />
                  <label>Y</label>
                  <TextInput controlWidth="full" value={layoutYInput} onChange={(event) => setLayoutYInput(event.currentTarget.value)} />
                  <label>W</label>
                  <TextInput controlWidth="full" value={layoutWInput} onChange={(event) => setLayoutWInput(event.currentTarget.value)} />
                  <label>H</label>
                  <TextInput controlWidth="full" value={layoutHInput} onChange={(event) => setLayoutHInput(event.currentTarget.value)} />
                </div>
                <Button onClick={saveLayout} compact>
                  Apply layout
                </Button>
              </div>
              <div style={sectionBlockStyle}>
                <div style={{ fontWeight: 600 }}>Visual</div>
                <TextInput
                  controlWidth="full"
                  value={bgColorInput}
                  onChange={(event) => setBgColorInput(event.currentTarget.value)}
                  placeholder="#hex"
                  aria-label="background-color"
                />
                <TextInput
                  controlWidth="full"
                  value={borderColorInput}
                  onChange={(event) => setBorderColorInput(event.currentTarget.value)}
                  placeholder="#hex"
                  aria-label="border-color"
                />
                <Button onClick={saveStyle} compact>
                  Apply visual
                </Button>
              </div>
              {selectedNode?.type === 'text' ? (
                <div style={sectionBlockStyle}>
                  <div style={{ fontWeight: 600 }}>Text Layer</div>
                  <TextInput
                    aria-label="node-content"
                    controlWidth="full"
                    value={contentInput}
                    onChange={(event) => setContentInput(event.currentTarget.value)}
                    placeholder="text"
                  />
                  <TextInput
                    aria-label="text-color"
                    controlWidth="full"
                    value={textColorInput}
                    onChange={(event) => setTextColorInput(event.currentTarget.value)}
                    placeholder="#hex"
                  />
                  <Button onClick={saveText} compact>
                    Update text
                  </Button>
                </div>
              ) : null}
              {selectedNode?.type === 'image' ? (
                <div style={sectionBlockStyle}>
                  <div style={{ fontWeight: 600 }}>Image Layer</div>
                  <TextInput
                    aria-label="node-src"
                    controlWidth="full"
                    value={srcInput}
                    onChange={(event) => setSrcInput(event.currentTarget.value)}
                    placeholder="image src"
                  />
                  <Button onClick={saveImageSrc} compact>
                    Update image src
                  </Button>
                </div>
              ) : null}
              <div style={sectionBlockStyle}>
                <div style={{ fontWeight: 600 }}>Canvas state</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Tab: {activeTab} / History: {history.state.past.length + history.state.future.length} entries
                </div>
              </div>
           </aside>
         </div>
       </div>
      )}
      rootClassName={rootClassName}
      rootStyle={rootStyle}
    />
  );
}

