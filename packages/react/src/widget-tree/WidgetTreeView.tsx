import { useMemo } from 'react';
import {
  collectWidgetNodes,
  getWidgetDisplayLabel,
  isWidgetPathSelected,
  widgetPathKey,
  type GenericWidget,
  type WidgetPath,
  type WidgetSelectionState,
} from '@workbench-kit/jdw';

import { Panel, PanelBody } from '../layout/Panel';
import { EmptyState } from '../primitives/EmptyState';
import { cx } from '../utils/cx';
import { formatWidgetPlacementMeta } from './widget-tree-layout.js';

export interface WidgetTreeViewProps {
  readonly root: GenericWidget | null;
  readonly parseError: string | null;
  readonly selection?: WidgetSelectionState | undefined;
  readonly onSelectPath?: ((path: WidgetPath) => void) | undefined;
}

function parentTypeForNode(
  nodes: ReturnType<typeof collectWidgetNodes>,
  path: WidgetPath,
): string | undefined {
  if (path.length === 0) return undefined;
  const parentPath = path.slice(0, -1);
  const parentKey = widgetPathKey(parentPath);
  return nodes.find((node) => widgetPathKey(node.path) === parentKey)?.widget.type;
}

export function WidgetTreeView({
  root,
  parseError,
  selection,
  onSelectPath,
}: WidgetTreeViewProps) {
  const nodes = useMemo(() => (root ? collectWidgetNodes(root) : []), [root]);

  return (
    <Panel className="widget-tree-outline" data-testid="widget-tree-outline-panel">
      <PanelBody className="widget-tree-outline__body">
        {parseError !== null ? (
          <EmptyState compact icon="codicon-error">
            {parseError}
          </EmptyState>
        ) : root === null ? (
          <EmptyState compact icon="codicon-list-tree">
            No widget root.
          </EmptyState>
        ) : (
          <ul aria-label="Widget outline" className="widget-tree-outline__list" role="tree">
            {nodes.map((node) => {
              const pathKey = widgetPathKey(node.path);
              const depth = node.path.length;
              const isSelected = selection
                ? isWidgetPathSelected(selection, node.path)
                : false;
              const parentType = parentTypeForNode(nodes, node.path);
              const placementMeta = formatWidgetPlacementMeta(node.widget, parentType);
              const textPreview =
                node.widget.type === 'text' && typeof node.widget.text === 'string'
                  ? node.widget.text
                  : null;

              return (
                <li
                  key={pathKey}
                  aria-level={depth + 1}
                  aria-selected={isSelected}
                  className={cx(
                    'widget-tree-outline__item',
                    isSelected && 'widget-tree-outline__item--selected',
                  )}
                  data-testid={`widget-tree-node-${pathKey}`}
                  role="treeitem"
                  style={{ paddingLeft: `${depth * 14 + 6}px` }}
                >
                  <button
                    className="widget-tree-outline__button"
                    type="button"
                    onClick={() => onSelectPath?.(node.path)}
                  >
                    <span className="widget-tree-outline__type">
                      {getWidgetDisplayLabel(node.widget)}
                    </span>
                    {placementMeta ? (
                      <span className="widget-tree-outline__placement">{placementMeta}</span>
                    ) : null}
                    {textPreview ? (
                      <span className="widget-tree-outline__meta">{textPreview}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
