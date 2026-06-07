import type { ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type {
  GenericWidget,
  WidgetPatch,
  WidgetPath,
  WidgetSelectionState,
} from '@workbench-kit/json-widget';
import {
  appendBoxChildPath,
  appendChildrenPath,
  isWidgetPathSelected,
  widgetPathKey,
} from '@workbench-kit/json-widget';

import { Badge } from '../../primitives/Badge';
import {
  WorkbenchTreeActionButton,
  WorkbenchTreeDropLine,
  WorkbenchTreeDropZone,
  WorkbenchTreeExpander,
  WorkbenchTreeItem,
} from '../../layout/WorkbenchTree';
import { cxCodicon } from '../../utils/codicon';
import { getWidgetChildren, isContainerWidget, widgetDisplayName } from './tree-model.js';
import type { DragNodeData, DropLine, DropZoneData } from './types.js';
import { INDENT_SIZE } from './types.js';

function DropLineView({ position }: { position: DropLine['position'] }) {
  return <WorkbenchTreeDropLine position={position} />;
}

function ContainerDropZone({
  path,
  highlighted,
  children,
}: {
  path: WidgetPath;
  highlighted: boolean;
  children: ReactNode;
}) {
  const pathKey = widgetPathKey(path);
  const { isOver, setNodeRef } = useDroppable({
    id: `tree-container:${pathKey}`,
    data: {
      path,
      pathKey,
      index: 0,
    } satisfies DropZoneData,
  });

  return (
    <WorkbenchTreeDropZone
      ref={setNodeRef}
      highlighted={highlighted || isOver}
      indentSize={INDENT_SIZE}
    >
      {children}
    </WorkbenchTreeDropZone>
  );
}

interface WidgetNodeProps {
  widget: GenericWidget;
  path: WidgetPath;
  indexInParent: number;
  depth: number;
  selection: WidgetSelectionState;
  expanded: Set<string>;
  dropLine: DropLine | null;
  highlightedContainerPath: string | null;
  onSelect: (path: WidgetPath) => void;
  onPatch?: ((patch: WidgetPatch) => void) | undefined;
  onToggleExpanded: (pathKey: string) => void;
}

export function WidgetTreeNode({
  widget,
  path,
  indexInParent,
  depth,
  selection,
  expanded,
  dropLine,
  highlightedContainerPath,
  onSelect,
  onPatch,
  onToggleExpanded,
}: WidgetNodeProps) {
  const pathKey = widgetPathKey(path);
  const selected = isWidgetPathSelected(selection, path);
  const isContainer = isContainerWidget(widget);
  const containerExpanded = isContainer ? expanded.has(pathKey) : false;
  const isRoot = path.length === 0;

  const children = getWidgetChildren(widget);
  const displayName = widgetDisplayName(widget);

  const {
    attributes,
    listeners,
    isDragging,
    setNodeRef: setDraggableRef,
  } = useDraggable({
    id: `tree:${pathKey}`,
    data: {
      path,
      pathKey,
      type: widget.type,
      displayName,
    } satisfies DragNodeData,
    disabled: isRoot,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `tree:${pathKey}`,
    data: {
      path,
      pathKey,
      index: indexInParent,
    } satisfies DropZoneData,
    disabled: isRoot,
  });

  const setRowRef = (node: HTMLDivElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <>
      <WorkbenchTreeItem
        ref={setRowRef}
        actions={
          onPatch && !isRoot ? (
            <WorkbenchTreeActionButton
              icon="trash"
              label="Remove widget"
              onClick={() => onPatch({ type: 'remove-widget', path })}
            />
          ) : undefined
        }
        control={
          <WorkbenchTreeExpander
            expanded={containerExpanded}
            label={containerExpanded ? 'Collapse widget' : 'Expand widget'}
            visible={isContainer && children.length > 0}
            onClick={() => onToggleExpanded(pathKey)}
          />
        }
        depth={depth}
        icon={<span className={cxCodicon('codicon-json')} aria-hidden />}
        indentSize={INDENT_SIZE}
        interaction={isRoot ? 'default' : isDragging ? 'dragging' : 'draggable'}
        label={displayName}
        meta={<Badge>{widget.type}</Badge>}
        selected={selected}
        onClick={() => onSelect(path)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(path);
          }
        }}
        {...listeners}
        {...attributes}
      >
        {dropLine?.pathKey === pathKey && dropLine ? (
          <DropLineView position={dropLine.position} />
        ) : null}
      </WorkbenchTreeItem>

      {isContainer && containerExpanded && children.length > 0 ? (
        <ContainerDropZone path={path} highlighted={highlightedContainerPath === pathKey}>
          {children.map((child, childIdx) => {
            const childPath =
              child === widget.child
                ? appendBoxChildPath(path)
                : appendChildrenPath(path, childIdx);
            return (
              <WidgetTreeNode
                key={widgetPathKey(childPath)}
                widget={child}
                path={childPath}
                indexInParent={childIdx}
                depth={depth + 1}
                selection={selection}
                expanded={expanded}
                dropLine={dropLine}
                highlightedContainerPath={highlightedContainerPath}
                onSelect={onSelect}
                onPatch={onPatch}
                onToggleExpanded={onToggleExpanded}
              />
            );
          })}
        </ContainerDropZone>
      ) : null}
    </>
  );
}
