import {
  createElement,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
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

import { readNumber } from '../utils/readNumber';
import { renderBuiltinWidgetLeaf } from './builtins/renderBuiltinWidgetLeaf.js';
import { BUILTIN_JDW_REGISTRY } from './createBuiltinJdwRegistry.js';
export interface CssRenderBackendOptions {
  /** Nested overflow and selection are opt-in; defaults preserve legacy rendering. */
  readonly nodeOverflow?: (node: LayoutNodeResult, path: WidgetPath) => 'hidden' | 'auto';
  readonly nodeSelection?: (
    node: LayoutNodeResult,
    path: WidgetPath,
  ) =>
    | {
        readonly elementId?: string;
        readonly selected: boolean;
        readonly label: string;
        readonly onSelect: () => void;
        readonly onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
      }
    | undefined;
  readonly renderNodeOverlay?: (node: LayoutNodeResult, path: WidgetPath) => ReactNode;
  readonly rootOverflow?: 'hidden' | 'auto' | undefined;
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

function isKeyboardActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
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
  const hostTag = layoutHostTag(widget, options);
  const isLayoutContainer = LAYOUT_CONTAINER_TYPES.has(widget.type);
  const leafContent = isLayoutContainer ? null : renderLeafContent(widget, options);
  const selection = options.nodeSelection?.(node, path);
  const selected =
    selection?.selected ??
    (options.selectedPath ? widgetPathEquals(path, options.selectedPath) : false);
  const interactive = Boolean(selection || options.onSelectPath);
  const scrollableRoot = path.length === 0 && options.rootOverflow === 'auto';
  const innerScroller = options.nodeOverflow?.(node, path) === 'auto';
  const scrollable = scrollableRoot || innerScroller;

  const content = [
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
  ];
  const renderedContent = innerScroller
    ? createElement(
        'div',
        {
          'data-layout-scroll-viewport': 'true',
          'data-layout-scroll-root': scrollableRoot ? 'true' : undefined,
          role: !interactive ? 'region' : undefined,
          'aria-label': !interactive ? 'Widget viewport' : undefined,
          tabIndex: !interactive ? 0 : undefined,
          style: { position: 'absolute', inset: 0, overflow: 'auto' },
        },
        ...content,
      )
    : content;

  return createElement(
    hostTag,
    {
      id: selection?.elementId,
      'aria-selected': interactive ? selected : undefined,
      'aria-label':
        selection?.label ??
        (scrollable && !interactive && !innerScroller ? 'Widget viewport' : undefined),
      'data-layout-node-id': typeof widget.id === 'string' ? widget.id : undefined,
      'data-layout-scroll-viewport': scrollableRoot && !innerScroller ? 'true' : undefined,
      'data-layout-scroll-root': scrollableRoot && !innerScroller ? 'true' : undefined,
      'data-layout-node': true,
      'data-widget-interactive': interactive ? 'true' : undefined,
      'data-widget-path': widgetPathKey(path),
      'data-widget-selected': selected ? 'true' : undefined,
      'data-widget-type': widget.type,
      role: interactive
        ? hostTag === 'div'
          ? 'button'
          : undefined
        : scrollable && !innerScroller
          ? 'region'
          : undefined,
      tabIndex: interactive ? (selected ? 0 : -1) : scrollable && !innerScroller ? 0 : undefined,
      onClick: interactive
        ? (event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            event.currentTarget.focus({ preventScroll: true });
            if (selection) selection.onSelect();
            else options.onSelectPath?.(path);
          }
        : undefined,
      onKeyDown: interactive
        ? (event: KeyboardEvent<HTMLElement>) => {
            // A focused descendant owns its keys; unhandled arrows may scroll natively.
            if (selection && event.target !== event.currentTarget) return;
            selection?.onKeyDown?.(event);
            if (event.defaultPrevented || !isKeyboardActivationKey(event.key)) return;

            event.preventDefault();
            event.stopPropagation();
            if (selection) selection.onSelect();
            else options.onSelectPath?.(path);
          }
        : undefined,
      style: {
        ...layoutNodeStyle(node, parentOrigin, widget),
        ...(options.renderNodeOverlay ? { isolation: 'isolate' as const } : {}),
        ...(scrollableRoot && !innerScroller ? { overflow: 'auto' } : {}),
      },
    },
    renderedContent,
    options.renderNodeOverlay
      ? createElement(
          'div',
          {
            'data-layout-overlay': true,
            style: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 },
          },
          options.renderNodeOverlay(node, path),
        )
      : null,
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
