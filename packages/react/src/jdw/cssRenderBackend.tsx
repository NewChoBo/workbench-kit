import { createElement, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { isWidgetHostTag, type WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  appendBoxChildPath,
  appendChildrenPath,
  DEFAULT_LAYOUT_CONSTRAINTS,
  getWidgetChildren,
  jdwNodeToGenericWidget,
  layoutWidget,
  widgetPathEquals,
  widgetPathKey,
  type GenericWidget,
  type JsonWidgetNode,
  type LayoutConstraints,
  type LayoutNodeResult,
  type WidgetPath,
} from '@workbench-kit/jdw';

import { renderBuiltinWidgetLeaf } from './builtins/renderBuiltinWidgetLeaf.js';
import { BUILTIN_JDW_REGISTRY } from './createBuiltinJdwRegistry.js';
export interface CssRenderBackendOptions {
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly emptyLabel?: string | undefined;
  readonly layoutConstraints?: LayoutConstraints | undefined;
  readonly selectedPath?: WidgetPath | null | undefined;
  readonly onSelectPath?: ((path: WidgetPath) => void) | undefined;
}

const LAYOUT_CONTAINER_TYPES = new Set([
  'row',
  'column',
  'grid',
  'stack',
  'box',
  'container',
  'padding',
  'align',
  'center',
  'sized_box',
]);

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function renderFromRegistry(
  registry: WidgetRegistryContract<unknown>,
  widget: GenericWidget,
  emptyLabel: string,
): ReactNode {
  const build = registry.get(widget.type);
  if (typeof build !== 'function') {
    return emptyLabel;
  }

  const output = (build as (value: GenericWidget) => unknown)(widget);
  if (output === null || output === undefined) {
    return emptyLabel;
  }

  return output as ReactNode;
}

function containerBackgroundStyle(widget: GenericWidget): CSSProperties {
  const background =
    typeof widget.background === 'string' && widget.background.trim().length > 0
      ? widget.background
      : undefined;

  return background ? { background } : {};
}

function layoutNodeStyle(
  node: LayoutNodeResult,
  parentOrigin: { readonly x: number; readonly y: number },
  widget: GenericWidget,
): CSSProperties {
  return {
    position: 'absolute',
    left: node.rect.x - parentOrigin.x,
    top: node.rect.y - parentOrigin.y,
    width: node.rect.width,
    height: node.rect.height,
    boxSizing: 'border-box',
    overflow: 'hidden',
    ...containerBackgroundStyle(widget),
  };
}

function layoutChildPath(parentWidget: GenericWidget, parentPath: WidgetPath, index: number) {
  if (Array.isArray(parentWidget.children)) {
    return appendChildrenPath(parentPath, index);
  }

  if (parentWidget.child && typeof parentWidget.child === 'object') {
    return appendBoxChildPath(parentPath);
  }

  const children = getWidgetChildren(parentWidget);
  if (children.length > 0) {
    return appendChildrenPath(parentPath, index);
  }

  return appendChildrenPath(parentPath, index);
}

function renderLeafContent(widget: GenericWidget, options: CssRenderBackendOptions): ReactNode {
  const { registry = BUILTIN_JDW_REGISTRY, emptyLabel = 'No render output.' } = options;

  if (registry.has(widget.type)) {
    return renderFromRegistry(registry, widget, emptyLabel);
  }

  return renderBuiltinWidgetLeaf(widget);
}

function layoutHostTag(widget: GenericWidget, options: CssRenderBackendOptions) {
  const { registry = BUILTIN_JDW_REGISTRY } = options;
  const hostTag = registry.definition(widget.type)?.hostTag;

  return isWidgetHostTag(hostTag) ? hostTag : 'div';
}

function renderLayoutNode(
  node: LayoutNodeResult,
  parentOrigin: { readonly x: number; readonly y: number },
  options: CssRenderBackendOptions,
  path: WidgetPath,
): ReactNode {
  const widget = node.widget;
  const isLayoutContainer = LAYOUT_CONTAINER_TYPES.has(widget.type);
  const leafContent = isLayoutContainer ? null : renderLeafContent(widget, options);
  const selected = options.selectedPath ? widgetPathEquals(path, options.selectedPath) : false;

  return createElement(
    layoutHostTag(widget, options),
    {
      'data-layout-node': true,
      'data-widget-interactive': options.onSelectPath ? 'true' : undefined,
      'data-widget-path': widgetPathKey(path),
      'data-widget-selected': selected ? 'true' : undefined,
      'data-widget-type': widget.type,
      onClick: options.onSelectPath
        ? (event: MouseEvent<HTMLDivElement>) => {
            event.stopPropagation();
            options.onSelectPath?.(path);
          }
        : undefined,
      style: layoutNodeStyle(node, parentOrigin, widget),
    },
    leafContent,
    ...node.children.map((child, index) =>
      createElement(
        'div',
        { key: index },
        renderLayoutNode(
          child,
          { x: node.rect.x, y: node.rect.y },
          options,
          layoutChildPath(widget, path, index),
        ),
      ),
    ),
  );
}

export function renderCssLayoutTree(
  tree: LayoutNodeResult,
  options: CssRenderBackendOptions = {},
): ReactNode {
  return createElement(
    'div',
    {
      'data-css-render-root': true,
      style: {
        position: 'relative',
        width: tree.rect.width,
        height: tree.rect.height,
        minHeight: readNumber(tree.widget.minHeight) ?? 24,
      },
    },
    renderLayoutNode(tree, { x: tree.rect.x, y: tree.rect.y }, options, []),
  );
}

export function renderJdwWithLayout(
  node: JsonWidgetNode,
  options: CssRenderBackendOptions = {},
): ReactNode {
  const widget = jdwNodeToGenericWidget(node);
  const tree = layoutWidget(
    widget,
    options.layoutConstraints ?? DEFAULT_LAYOUT_CONSTRAINTS,
    { x: 0, y: 0 },
    { registry: options.registry ?? BUILTIN_JDW_REGISTRY },
  );
  return renderCssLayoutTree(tree, options);
}
