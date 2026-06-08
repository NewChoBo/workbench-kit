import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkbenchDocumentNode } from './workbenchDocument';
import type { WorkbenchDocumentRenderContext } from './workbenchDocument';
import type { WorkbenchPage, WorkbenchNodeLayout, WorkbenchVisualStyle } from './workbenchDocument';

const DEFAULT_NODE_MIN_SIZE = 12;
const RESIZE_HANDLE_SIZE = 10;

export interface WorkbenchDocumentRendererProps {
  page: WorkbenchPage;
  context?: WorkbenchDocumentRenderContext;
  selectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeMove?: (nodeId: string, layout: WorkbenchNodeLayout) => void;
  className?: string;
  style?: CSSProperties;
}

type DragInteraction = 'move' | 'resize';

type DragState = {
  nodeId: string;
  interaction: DragInteraction;
  startPointerX: number;
  startPointerY: number;
  startLayoutX: number;
  startLayoutY: number;
  startWidth?: number;
  startHeight?: number;
  constraints?: WorkbenchDocumentNode['constraints'];
  pointerId: number;
};

type NodeLookup = Map<string, WorkbenchDocumentNode>;

function toCssPx(value?: number): string | undefined {
  return value === undefined ? undefined : `${value}px`;
}

function styleFromNodeStyle(style?: WorkbenchVisualStyle): CSSProperties {
  if (!style) {
    return {};
  }

  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderRadius: toCssPx(style.borderRadius),
    borderStyle: style.borderWidth ? 'solid' : undefined,
    borderWidth: style.borderWidth,
    boxShadow: style.boxShadow,
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    opacity: style.opacity,
    textAlign: style.textAlign,
  };
}

function layoutToStyle(layout?: WorkbenchNodeLayout): CSSProperties {
  if (!layout) {
    return {};
  }

  return {
    left: toCssPx(layout.x),
    top: toCssPx(layout.y),
    width: layout.width === undefined ? 'auto' : toCssPx(layout.width),
    height: layout.height === undefined ? 'auto' : toCssPx(layout.height),
    zIndex: layout.zIndex,
    transform: layout.rotate ? `rotate(${layout.rotate}deg)` : undefined,
  };
}

function scaleTransform(scale: number): string {
  return scale === 1 ? '' : `scale(${scale})`;
}

function buildNodeStyle(
  node: WorkbenchDocumentNode,
  context: WorkbenchDocumentRenderContext | undefined,
): CSSProperties {
  const scale = context?.scale ?? 1;
  const layout = layoutToStyle(node.layout);
  const style = styleFromNodeStyle(node.style);
  const selected = context?.selectedNodeIds?.includes(node.id) || false;
  const hovered = context?.hoveredNodeId === node.id;

  return {
    ...layout,
    ...style,
    position:
      node.layout?.x !== undefined ||
      node.layout?.y !== undefined ||
      node.layout?.width !== undefined ||
      node.layout?.height !== undefined
        ? 'absolute'
        : undefined,
    minWidth: layout.width ?? undefined,
    minHeight: layout.height ?? undefined,
    display: 'block',
    transform:
      `${node.layout?.rotate ? ` rotate(${node.layout.rotate}deg)` : ''}${scaleTransform(scale)}`.trim() ||
      undefined,
    outline: selected ? '2px solid #4f46e5' : hovered ? '2px dashed #94a3b8' : undefined,
    boxSizing: 'border-box',
    cursor: node.locked ? 'default' : 'pointer',
    overflow: 'visible',
  };
}

function isContainerNode(node: WorkbenchDocumentNode): boolean {
  return (
    node.type === 'frame' ||
    node.type === 'group' ||
    node.type === 'component' ||
    node.type === 'instance'
  );
}

function canResizeNode(node: WorkbenchDocumentNode): boolean {
  return (
    !node.locked && Boolean(node.layout?.width !== undefined && node.layout?.height !== undefined)
  );
}

function clamp(
  value: number | undefined,
  min = DEFAULT_NODE_MIN_SIZE,
  max?: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  let next = value;
  if (next < min) {
    next = min;
  }
  if (max !== undefined && next > max) {
    next = max;
  }
  return next;
}

function applyConstraints(
  layout: WorkbenchNodeLayout,
  constraints: WorkbenchDocumentNode['constraints'] | undefined,
): WorkbenchNodeLayout {
  if (!constraints) {
    return layout;
  }
  return {
    ...layout,
    width: clamp(layout.width, constraints.minWidth, constraints.maxWidth),
    height: clamp(layout.height, constraints.minHeight, constraints.maxHeight),
  };
}

function getResizeHandleLabel(node: WorkbenchDocumentNode, selected: boolean): string | undefined {
  if (!selected || !canResizeNode(node)) {
    return undefined;
  }
  return `Resize ${node.id}`;
}

type NodeRendererProps = {
  node: WorkbenchDocumentNode;
  style: CSSProperties;
  children: ReactNode[];
  onClick?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onResizeHandlePointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  resizeHandleLabel?: string;
};

function renderResizeHandle(
  label: string | undefined,
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void,
) {
  if (!label || !onPointerDown) {
    return null;
  }
  return (
    <div
      aria-label={label}
      style={{
        position: 'absolute',
        width: `${RESIZE_HANDLE_SIZE}px`,
        height: `${RESIZE_HANDLE_SIZE}px`,
        right: `${-RESIZE_HANDLE_SIZE / 2}px`,
        bottom: `${-RESIZE_HANDLE_SIZE / 2}px`,
        background: '#4f46e5',
        borderRadius: 2,
        cursor: 'nwse-resize',
        zIndex: 2,
      }}
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

const nodeRendererRegistry: Record<string, (params: NodeRendererProps) => ReactNode> = {
  frame: ({
    node,
    style,
    children,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  group: ({
    node,
    style,
    children,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  component: ({
    node,
    style,
    children,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  instance: ({
    node,
    style,
    children,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  rectangle: ({
    node,
    style,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  circle: ({
    node,
    style,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={{ ...style, borderRadius: '50%' }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  text: ({ node, style, onClick, onPointerDown, onResizeHandlePointerDown, resizeHandleLabel }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {(node as { content?: string }).content ?? ''}
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  image: ({
    node,
    style,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => {
    const src = (node as { src?: string }).src ?? '';
    return (
      <div
        key={node.id}
        data-node-id={node.id}
        style={style}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        {src ? (
          <img
            src={src}
            alt={node.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        {!src ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: 12,
              background: '#1f2937',
              border: '1px dashed #334155',
              boxSizing: 'border-box',
            }}
          >
            no image src
          </div>
        ) : null}
        {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
      </div>
    );
  },
  vector: ({
    node,
    style,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {(node as { content?: string }).content ?? ''}
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
  unknown: ({
    node,
    style,
    onClick,
    onPointerDown,
    onResizeHandlePointerDown,
    resizeHandleLabel,
  }) => (
    <div
      key={node.id}
      data-node-id={node.id}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {renderResizeHandle(resizeHandleLabel, onResizeHandlePointerDown)}
    </div>
  ),
};

function renderNode(
  node: WorkbenchDocumentNode,
  lookup: NodeLookup,
  context: WorkbenchDocumentRenderContext | undefined,
  onNodeClick: ((nodeId: string) => void) | undefined,
  onNodePointerDown:
    | ((
        node: WorkbenchDocumentNode,
        event: ReactPointerEvent<HTMLElement>,
        interaction: DragInteraction,
      ) => void)
    | undefined,
  resolveLayout: (node: WorkbenchDocumentNode) => WorkbenchNodeLayout | undefined,
): ReactNode {
  const nodeWithLayout = { ...node, layout: resolveLayout(node) };
  const childRenderer = nodeRendererRegistry[node.type] ?? nodeRendererRegistry.unknown;
  const children: ReactNode[] = [];

  if (isContainerNode(node) && node.children?.length) {
    for (const childId of node.children) {
      const child = lookup.get(childId);
      if (!child) {
        continue;
      }
      children.push(
        renderNode(child, lookup, context, onNodeClick, onNodePointerDown, resolveLayout),
      );
    }
  }

  const selectedNodeIds = context?.selectedNodeIds ?? [];
  const isSelected = selectedNodeIds.includes(node.id);

  const onClick = onNodeClick && !node.locked ? () => onNodeClick(node.id) : undefined;
  const onMovePointerDown =
    onNodePointerDown && !node.locked
      ? (event: ReactPointerEvent<HTMLElement>) => onNodePointerDown(node, event, 'move')
      : undefined;
  const onResizePointerDown =
    onNodePointerDown && canResizeNode(nodeWithLayout) && !node.locked
      ? (event: ReactPointerEvent<HTMLElement>) =>
          onNodePointerDown(nodeWithLayout, event, 'resize')
      : undefined;
  const style = buildNodeStyle(nodeWithLayout, context);

  return childRenderer({
    node: nodeWithLayout,
    style,
    children,
    onClick,
    onPointerDown: onMovePointerDown,
    onResizeHandlePointerDown: onResizePointerDown,
    resizeHandleLabel: getResizeHandleLabel(nodeWithLayout, isSelected),
  });
}

export function WorkbenchDocumentRenderer({
  page,
  context,
  selectedNodeId,
  onNodeClick,
  onNodeMove,
  className,
  style,
}: WorkbenchDocumentRendererProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, WorkbenchNodeLayout>>({});
  const dragPreviewRef = useRef<Record<string, WorkbenchNodeLayout>>({});
  const hasMoveHandler = onNodeMove !== undefined;
  const scale = context?.scale ?? 1;

  useEffect(() => {
    if (!dragState || !hasMoveHandler) {
      return;
    }

    const computeNextMove = (pointerX: number, pointerY: number): WorkbenchNodeLayout => ({
      x: dragState.startLayoutX + (pointerX - dragState.startPointerX) / scale,
      y: dragState.startLayoutY + (pointerY - dragState.startPointerY) / scale,
    });

    const computeNextResize = (pointerX: number, pointerY: number): WorkbenchNodeLayout =>
      applyConstraints(
        {
          x: dragState.startLayoutX,
          y: dragState.startLayoutY,
          width:
            dragState.startWidth === undefined
              ? undefined
              : dragState.startWidth + (pointerX - dragState.startPointerX) / scale,
          height:
            dragState.startHeight === undefined
              ? undefined
              : dragState.startHeight + (pointerY - dragState.startPointerY) / scale,
        },
        dragState.constraints,
      );

    const applyPreview = (nextLayout: WorkbenchNodeLayout) => {
      const next = { [dragState.nodeId]: nextLayout };
      dragPreviewRef.current = next;
      setDragPreview(next);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }
      event.preventDefault();
      const nextLayout =
        dragState.interaction === 'resize'
          ? computeNextResize(event.clientX, event.clientY)
          : computeNextMove(event.clientX, event.clientY);
      applyPreview(nextLayout);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }
      event.preventDefault();
      const finalLayout = dragPreviewRef.current[dragState.nodeId];
      setDragState(null);
      setDragPreview({});
      dragPreviewRef.current = {};
      if (!hasMoveHandler || !finalLayout || !onNodeMove) {
        return;
      }
      onNodeMove(dragState.nodeId, finalLayout);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragState, hasMoveHandler, onNodeMove, scale]);

  const handleInteractionStart = (
    node: WorkbenchDocumentNode,
    event: ReactPointerEvent<HTMLElement>,
    interaction: DragInteraction,
  ) => {
    if (!hasMoveHandler) {
      return;
    }
    if (event.button !== 0 || node.locked) {
      return;
    }

    const layout = node.layout ?? {};
    if (interaction === 'move' && (layout.x === undefined || layout.y === undefined)) {
      return;
    }
    if (
      interaction === 'resize' &&
      (layout.x === undefined ||
        layout.y === undefined ||
        layout.width === undefined ||
        layout.height === undefined)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDragState({
      nodeId: node.id,
      interaction,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startLayoutX: layout.x ?? 0,
      startLayoutY: layout.y ?? 0,
      startWidth: interaction === 'resize' ? layout.width : undefined,
      startHeight: interaction === 'resize' ? layout.height : undefined,
      constraints: node.constraints,
      pointerId: event.pointerId,
    });
    setDragPreview({});
    dragPreviewRef.current = {};
  };

  const lookup = useMemo<NodeLookup>(() => {
    const map = new Map<string, WorkbenchDocumentNode>();
    for (const node of page.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [page.nodes]);

  const rootNodeIds = useMemo(() => {
    const childIdSet = new Set(
      page.nodes.flatMap((node) => {
        const nodeChildren =
          'children' in node ? (node as { children?: readonly string[] }).children : undefined;
        return nodeChildren ?? [];
      }),
    );
    return page.nodes
      .filter((node) => !node.parentId && !childIdSet.has(node.id))
      .map((node) => node.id);
  }, [page.nodes]);

  const normalizedSelectedIds = useMemo(() => {
    const selectedNodeIds = context?.selectedNodeIds ?? [];
    if (selectedNodeId && !selectedNodeIds.includes(selectedNodeId)) {
      return [...selectedNodeIds, selectedNodeId];
    }
    return selectedNodeIds;
  }, [context?.selectedNodeIds, selectedNodeId]);

  const resolveLayout = (node: WorkbenchDocumentNode): WorkbenchNodeLayout | undefined => {
    const preview = dragPreview[node.id];
    const base = node.layout;

    if (!preview && !base) {
      return base;
    }

    if (!preview) {
      return base;
    }
    if (!base) {
      return preview;
    }

    return {
      ...base,
      ...preview,
    };
  };

  const pageStyle: CSSProperties = {
    position: 'relative',
    width: page.width ? `${page.width}px` : '100%',
    height: page.height ? `${page.height}px` : '100%',
    background: page.background,
    overflow: 'hidden',
    ...style,
  };

  return (
    <div className={className} style={pageStyle} data-page-id={page.id}>
      {rootNodeIds.map((nodeId) => {
        const node = lookup.get(nodeId);
        if (!node) {
          return null;
        }
        return renderNode(
          node,
          lookup,
          {
            ...context,
            selectedNodeIds: normalizedSelectedIds,
          },
          onNodeClick,
          hasMoveHandler ? handleInteractionStart : undefined,
          resolveLayout,
        );
      })}
    </div>
  );
}
