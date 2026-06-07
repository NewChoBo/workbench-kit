import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import { Button } from '../primitives/Button';
import {
  WorkbenchDocumentRenderer,
  type WorkbenchDocument,
  createPatchFromWorkbenchDocumentAction,
  documentNodesToWorkspaceFiles,
  workspaceFilesToDocument,
  initializeWorkbenchDocumentPatchHistory,
  isWorkbenchDocumentSupported,
  type WorkbenchDocumentPatchResult,
  type WorkbenchDocumentPatchHistoryState,
} from './index';
import type { WorkbenchDocumentAction } from './index';
import type { WorkspaceFile } from './workspace';

const meta = {
  title: 'React/Workbench/DocumentRenderer',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type WorkbenchPatchApplyResult = {
  state: WorkbenchDocumentPatchHistoryState;
  result: WorkbenchDocumentPatchResult;
};

const initialDocument: WorkbenchDocument = {
  version: '1.0.0',
  schemaVersion: 1,
  pages: [
    {
      id: 'page-main',
      name: 'Main',
      width: 960,
      height: 600,
      background: '#f5f5f5',
      nodes: [
        {
          id: 'frame-hero',
          type: 'frame',
          name: 'Hero',
          layout: { x: 40, y: 24, width: 420, height: 160 },
          style: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8 },
          children: ['title-text', 'subtitle-text'],
        },
        {
          id: 'title-text',
          type: 'text',
          name: 'Title',
          parentId: 'frame-hero',
          layout: { x: 16, y: 16, width: 340, height: 40 },
          style: { color: '#111827', fontSize: 24, fontFamily: 'Arial' },
          content: 'Workbench',
        },
        {
          id: 'subtitle-text',
          type: 'text',
          name: 'Subtitle',
          parentId: 'frame-hero',
          layout: { x: 16, y: 64, width: 340, height: 28 },
          style: { color: '#334155', fontSize: 16, fontFamily: 'Arial' },
          content: 'JSON-first canvas',
        },
      ],
    },
  ],
};

export const RendererWithHistory: Story = {
  render: () => {
    const [documentJson, setDocumentJson] = useState<WorkbenchDocument>(initialDocument);
    const [history] = useState(() => initializeWorkbenchDocumentPatchHistory(initialDocument));
    const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
    const [statusText, setStatusText] = useState('ready');
    const [revision, setRevision] = useState(0);

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
      setRevision((value) => value + 1);
      setStatusText(`patch ${patchResult.result.document.version || 'ok'} applied`);
    };

    const onUndo = () => {
      const nextState = history.undo();
      if (!nextState) {
        setStatusText('nothing to undo');
        return;
      }
      setDocumentJson(nextState.present);
      setRevision((value) => value + 1);
      setStatusText('undo');
    };

    const onRedo = () => {
      const nextState = history.redo();
      if (!nextState) {
        setStatusText('nothing to redo');
        return;
      }
      setDocumentJson(nextState.present);
      setRevision((value) => value + 1);
      setStatusText('redo');
    };

    const applyMove = (nodeId: string, layout: Partial<WorkbenchDocument['pages'][number]['nodes'][number]['layout']>) => {
      const targetNode = history.state.present.pages[0]?.nodes.find((node) => node.id === nodeId);
      const nextLayout = {
        ...(targetNode?.layout ?? {}),
        ...layout,
      };

      applyAction({
        action: 'replace-layout',
        pageId: 'page-main',
        nodeId,
        layout: nextLayout,
      });
    };

    const onClickNode = (nodeId: string) => {
      setSelectedId(nodeId);
      setStatusText(`selected ${nodeId}`);
    };

    const createRectangle = () => {
      const id = `rect-${Date.now()}`;
      applyAction({
        action: 'create',
        pageId: 'page-main',
        node: {
          id,
          type: 'rectangle',
          name: `Rect ${Date.now()}`,
          layout: {
            x: 60 + (Math.random() * 120),
            y: 220 + (Math.random() * 120),
            width: 140,
            height: 90,
          },
          style: {
            backgroundColor: '#93c5fd',
            borderColor: '#1d4ed8',
            borderWidth: 1,
            borderRadius: 8,
          },
        },
      });
      setStatusText('create rectangle');
    };

    const selectedNode = history.state.present.pages[0]?.nodes.find((node) => node.id === selectedId);
    const canUndo = history.canUndo;
    const canRedo = history.canRedo;

    return (
      <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() =>
              applyAction({
                action: 'replace-content',
                pageId: 'page-main',
                nodeId: selectedNode?.id ?? 'subtitle-text',
                content:
                  selectedNode?.id === 'subtitle-text'
                    ? 'Drag-and-drop JSON canvas'
                    : 'Figma-like interactions',
              })
            }
          >
            update selected content
          </Button>
          <Button
            onClick={() =>
              applyAction({
                action: 'rename',
                pageId: 'page-main',
                nodeId: selectedNode?.id ?? 'title-text',
                name: `Updated-${Date.now()}`,
              })
            }
          >
            rename selected
          </Button>
          <Button
            onClick={() =>
              applyAction({
                action: 'replace-style',
                pageId: 'page-main',
                nodeId: selectedNode?.id ?? 'frame-hero',
                style: {
                  backgroundColor: '#fde68a',
                  borderColor: '#f59e0b',
                  borderWidth: 2,
                },
              })
            }
          >
            recolor selected
          </Button>
          <Button onClick={() => onUndo()} disabled={!canUndo}>
            Undo
          </Button>
          <Button onClick={() => onRedo()} disabled={!canRedo}>
            Redo
          </Button>
          <Button onClick={createRectangle}>create rectangle</Button>
        </div>
        <p style={{ margin: 0 }}>
          revision:{' '}
          <strong>{revision}</strong> | selected: <strong>{selectedId ?? 'none'}</strong> | status:{' '}
          <strong>{statusText}</strong>
        </p>
        <div style={{ marginTop: 12, background: '#fff', padding: 8 }}>
          <WorkbenchDocumentRenderer
            page={history.state.present.pages[0]}
            onNodeMove={(nodeId, layout) => applyMove(nodeId, layout)}
            selectedNodeId={selectedId}
            onNodeClick={onClickNode}
            style={{ height: 640 }}
          />
        </div>
      </div>
    );
  },
};

const sampleWorkspaceFiles: WorkspaceFile[] = [
  {
    path: 'notes/readme.md',
    content: '# Notes\n\nJSON-first workbench sample',
    updatedAt: '2026-01-01T00:00:00.000Z',
    mimeType: 'text/markdown',
    source: 'user',
  },
  {
    path: 'src/main.ts',
    content: 'console.log("hello world");',
    updatedAt: '2026-01-01T00:00:00.000Z',
    mimeType: 'text/typescript',
    source: 'assistant',
  },
];

export const AdapterRoundTrip: Story = {
  render: () => {
    const adaptedDocument = workspaceFilesToDocument(sampleWorkspaceFiles, { pageName: 'Adapter Roundtrip' });
    const restoredFiles = documentNodesToWorkspaceFiles(adaptedDocument);

    return (
      <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
        <p style={{ marginTop: 0 }}>
          generated nodes: <strong>{adaptedDocument.pages[0]?.nodes.length ?? 0}</strong> | restored files:{' '}
          <strong>{restoredFiles.length}</strong>
        </p>
        <div style={{ marginBottom: 12 }}>
          <WorkbenchDocumentRenderer
            page={adaptedDocument.pages[0]}
            style={{ height: 320, background: '#f8fafc' }}
          />
        </div>
        <pre
          style={{
            margin: 0,
            background: '#111827',
            color: '#d1fae5',
            borderRadius: 8,
            padding: 12,
            overflowX: 'auto',
          }}
        >
          {`roundtrip files:\n${JSON.stringify(
            restoredFiles.map((file) => ({ path: file.path, mimeType: file.mimeType, contentPreview: file.content.slice(0, 20) })),
            null,
            2,
          )}`}
        </pre>
      </div>
    );
  },
};

const featureTestDocument: WorkbenchDocument = {
  version: '1.0.0',
  schemaVersion: 1,
  pages: [
    {
      id: 'page-feature-test',
      name: 'Feature Test Page',
      width: 1024,
      height: 640,
      background: '#f1f5f9',
      nodes: [
        {
          id: 'frame-root',
          type: 'frame',
          name: 'Root Frame',
          layout: { x: 24, y: 24, width: 520, height: 220 },
          style: { backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 10 },
          children: ['ft-title', 'ft-subtitle'],
        },
        {
          id: 'ft-title',
          type: 'text',
          name: 'Title',
          parentId: 'frame-root',
          layout: { x: 14, y: 12, width: 300, height: 46 },
          style: { color: '#1e293b', fontSize: 28, fontFamily: 'Arial' },
          content: 'Figma-like feature test',
        },
        {
          id: 'ft-subtitle',
          type: 'text',
          name: 'Subtitle',
          parentId: 'frame-root',
          layout: { x: 14, y: 68, width: 300, height: 28 },
          style: { color: '#334155', fontSize: 16, fontFamily: 'Arial' },
          content: 'move / select / edit / undo / redo',
        },
        {
          id: 'ft-rect',
          type: 'rectangle',
          name: 'Color Tile',
          layout: { x: 640, y: 90, width: 150, height: 120 },
          style: {
            backgroundColor: '#bfdbfe',
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 8,
          },
        },
      ],
    },
  ],
};

export const FeatureTestScreen: Story = {
  render: () => {
    const [documentJson, setDocumentJson] = useState<WorkbenchDocument>(featureTestDocument);
    const [history] = useState(() => initializeWorkbenchDocumentPatchHistory(featureTestDocument));
    const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
    const [revision, setRevision] = useState(0);
    const [statusText, setStatusText] = useState('ready');

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
      setRevision((value) => value + 1);
      setStatusText(`patch applied (${patchResult.result.document.version || 'ok'})`);
    };

    const applyMove = (nodeId: string, layout: Partial<WorkbenchDocument['pages'][number]['nodes'][number]['layout']>) => {
      const targetNode = history.state.present.pages[0]?.nodes.find((node) => node.id === nodeId);
      const nextLayout = {
        ...(targetNode?.layout ?? {}),
        ...layout,
      };
      applyAction({
        action: 'replace-layout',
        pageId: 'page-feature-test',
        nodeId,
        layout: nextLayout,
      });
    };

    const addLabelNode = () => {
      const id = `ft-label-${Date.now()}`;
      applyAction({
        action: 'create',
        pageId: 'page-feature-test',
        node: {
          id,
          type: 'text',
          name: `Label ${Date.now()}`,
          layout: {
            x: 80 + Math.random() * 260,
            y: 300 + Math.random() * 130,
            width: 180,
            height: 32,
          },
          style: {
            color: '#0f172a',
            fontSize: 14,
            fontFamily: 'Arial',
          },
          content: 'New text node',
        },
      });
      setStatusText('create text');
    };

    const onClickNode = (nodeId: string) => {
      setSelectedId(nodeId);
      setStatusText(`selected ${nodeId}`);
    };

    const replaceSelectedStyle = () => {
      const nodeId = selectedId;
      if (!nodeId) {
        setStatusText('select a node first');
        return;
      }
      applyAction({
        action: 'replace-style',
        pageId: 'page-feature-test',
        nodeId,
        style: {
          borderColor: '#7c3aed',
          borderWidth: 2,
          borderRadius: 10,
        },
      });
    };

    return (
      <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
        <h3 style={{ margin: 0 }}>Figma MVP 기능 테스트</h3>
        <p style={{ marginTop: 8 }}>
          테스트 항목: 노드 생성 / 선택 / 스타일 변경 / 이동(드래그) / Undo / Redo
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <Button onClick={addLabelNode}>label node 생성</Button>
          <Button onClick={replaceSelectedStyle}>선택 노드 스타일 변경</Button>
          <Button
            onClick={() =>
              applyAction({
                action: 'replace-content',
                pageId: 'page-feature-test',
                nodeId: selectedId ?? 'ft-subtitle',
                content: 'feature test updated',
              })
            }
          >
            선택 노드 텍스트 변경
          </Button>
          <Button onClick={() => {
            const nextState = history.undo();
            if (!nextState) {
              setStatusText('nothing to undo');
              return;
            }
            setDocumentJson(nextState.present);
            setRevision((value) => value + 1);
            setStatusText('undo');
          }} disabled={!history.canUndo}>
            Undo
          </Button>
          <Button onClick={() => {
            const nextState = history.redo();
            if (!nextState) {
              setStatusText('nothing to redo');
              return;
            }
            setDocumentJson(nextState.present);
            setRevision((value) => value + 1);
            setStatusText('redo');
          }} disabled={!history.canRedo}>
            Redo
          </Button>
        </div>
        <p style={{ margin: 0 }} data-testid="feature-status">
          revision: <strong>{revision}</strong> | selected: <strong>{selectedId ?? 'none'}</strong> | status:{' '}
          <strong>{statusText}</strong>
        </p>
        <p style={{ color: '#93c5fd' }}>
          힌트: 텍스트/도형을 직접 클릭해 선택하고, 드래그하면 이동됩니다. (컨테이너 이동은 아직 미지원)
        </p>
        <WorkbenchDocumentRenderer
          page={history.state.present.pages[0]}
          onNodeMove={(nodeId, layout) => applyMove(nodeId, layout)}
          selectedNodeId={selectedId}
          onNodeClick={onClickNode}
          style={{ height: 520, marginTop: 8, background: '#fff' }}
        />
      </div>
    );
  },
  tags: ['storybook-play-required'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const docWindow = canvasElement.ownerDocument.defaultView ?? window;
    await userEvent.click(canvas.getByRole('button', { name: 'label node 생성' }));
    await expect(canvas.getByTestId('feature-status')).toHaveTextContent('create text');

    await userEvent.click(canvas.getByText('Figma-like feature test'));
    await expect(canvas.getByTestId('feature-status')).toHaveTextContent('selected ft-title');

    await userEvent.click(canvas.getByRole('button', { name: '선택 노드 스타일 변경' }));
    await expect(canvas.getByText('Figma-like feature test')).toBeVisible();

    const resizeHandle = canvas.getByLabelText('Resize ft-rect');
    const status = canvas.getByTestId('feature-status');
    await expect(resizeHandle).toBeVisible();
    fireEvent.pointerDown(resizeHandle, { button: 0, clientX: 640, clientY: 90, pointerId: 11 });
    fireEvent.pointerMove(docWindow, { clientX: 700, clientY: 120, pointerId: 11 });
    fireEvent.pointerUp(docWindow, { clientX: 700, clientY: 120, pointerId: 11 });
    await expect(status).toHaveTextContent('patch');
  },
};
