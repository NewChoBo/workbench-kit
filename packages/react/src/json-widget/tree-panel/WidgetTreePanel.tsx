import { useEffect, useRef, useState } from 'react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type {
  GenericWidget,
  WidgetPatch,
  WidgetPath,
  WidgetSelectionState,
} from '@workbench-kit/json-widget';
import { collectAllContainerKeys, ROOT_WIDGET_PATH } from '@workbench-kit/json-widget';

import { WorkbenchTree } from '../../layout/WorkbenchTree';
import { WidgetDragOverlay } from './WidgetDragOverlay.js';
import { WidgetTreeNode } from './WidgetTreeNode.js';
import type { DragNodeData, DropLine, DropZoneData } from './types.js';
import { INDENT_SIZE, ROW_HEIGHT } from './types.js';

export interface WidgetTreePanelProps {
  root: GenericWidget;
  selection: WidgetSelectionState;
  onSelect: (path: WidgetPath) => void;
  onPatch?: (patch: WidgetPatch) => void;
  readOnly?: boolean;
}

export function WidgetTreePanel({
  root,
  selection,
  onSelect,
  onPatch,
  readOnly = false,
}: WidgetTreePanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectAllContainerKeys(root, ROOT_WIDGET_PATH),
  );

  const prevRootRef = useRef(root);
  useEffect(() => {
    if (root !== prevRootRef.current) {
      const allKeys = collectAllContainerKeys(root, ROOT_WIDGET_PATH);
      setExpanded((prev) => {
        const next = new Set(prev);
        allKeys.forEach((key) => {
          if (!prev.has(key)) {
            next.add(key);
          }
        });
        return next;
      });
      prevRootRef.current = root;
    }
  }, [root]);

  const [dropLine, setDropLine] = useState<DropLine | null>(null);
  const [highlightedContainerPath, setHighlightedContainerPath] = useState<string | null>(null);
  const [overlayData, setOverlayData] = useState<DragNodeData | null>(null);

  const resetDragState = () => {
    setDropLine(null);
    setHighlightedContainerPath(null);
    setOverlayData(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragNodeData | undefined;
    setOverlayData(data ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const over = event.over;
    if (!over) {
      setDropLine(null);
      setHighlightedContainerPath(null);
      return;
    }

    const overId = String(over.id);
    if (overId.startsWith('tree:')) {
      const draggedRect = event.active.rect.current.translated;
      const dragCenterY = draggedRect ? draggedRect.top + draggedRect.height / 2 : over.rect.top;
      setDropLine({
        pathKey: overId.slice('tree:'.length),
        position: dragCenterY < over.rect.top + over.rect.height / 2 ? 'above' : 'below',
      });
      setHighlightedContainerPath(null);
      return;
    }

    if (overId.startsWith('tree-container:')) {
      setDropLine(null);
      setHighlightedContainerPath(overId.slice('tree-container:'.length));
      return;
    }

    setDropLine(null);
    setHighlightedContainerPath(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const active = event.active.data.current as DragNodeData | undefined;
    const over = event.over;
    const overData = over ? (over.data.current as DropZoneData | undefined) : null;

    if (active && over && overData && onPatch && !readOnly) {
      const activePath = active.path;
      const overId = String(over.id);

      if (overId.startsWith('tree:')) {
        const destParentPath = overData.path.slice(0, -1);
        const insertIndex = dropLine?.position === 'below' ? overData.index + 1 : overData.index;

        onPatch({
          type: 'reparent-widget',
          fromPath: activePath,
          toParentPath: destParentPath,
          insertIndex,
        });
      } else if (overId.startsWith('tree-container:')) {
        onPatch({
          type: 'reparent-widget',
          fromPath: activePath,
          toParentPath: overData.path,
          insertIndex: 0,
        });
      }
    }

    resetDragState();
  };

  const tree = (
    <WorkbenchTree
      aria-label="Widget tree"
      className="ui-json-widget-tree-panel"
      indentSize={INDENT_SIZE}
      rowHeight={ROW_HEIGHT}
    >
      <WidgetTreeNode
        widget={root}
        path={ROOT_WIDGET_PATH}
        indexInParent={-1}
        depth={0}
        selection={selection}
        expanded={expanded}
        dropLine={dropLine}
        highlightedContainerPath={highlightedContainerPath}
        onSelect={onSelect}
        onPatch={readOnly ? undefined : onPatch}
        onToggleExpanded={(pathKey) =>
          setExpanded((current) => {
            const next = new Set(current);
            if (next.has(pathKey)) next.delete(pathKey);
            else next.add(pathKey);
            return next;
          })
        }
      />
    </WorkbenchTree>
  );

  if (readOnly) {
    return tree;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragCancel={resetDragState}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
    >
      {tree}
      <DragOverlay>
        <WidgetDragOverlay data={overlayData} />
      </DragOverlay>
    </DndContext>
  );
}
