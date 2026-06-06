import { forwardRef } from 'react';
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { IconButton } from '../primitives/IconButton';
import type { IconButtonProps } from '../primitives/IconButton';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { toLengthValue } from './layoutHelpers';

function treeIndentOffset(depth: number, indentSize: number) {
  return `${8 + depth * indentSize}px`;
}

export interface WorkbenchTreeProps extends ComponentPropsWithRef<'div'> {
  indentSize?: number | string;
  rowHeight?: number | string;
}

export function WorkbenchTree({
  className,
  indentSize,
  role = 'tree',
  rowHeight,
  style,
  ...props
}: WorkbenchTreeProps) {
  const treeStyle = {
    ...(indentSize !== undefined
      ? { '--ui-workbench-tree-indent-size': toLengthValue(indentSize) }
      : null),
    ...(rowHeight !== undefined
      ? { '--ui-workbench-tree-row-height': toLengthValue(rowHeight) }
      : null),
    ...style,
  } as CSSProperties;

  return (
    <div className={cx('ui-workbench-tree', className)} role={role} style={treeStyle} {...props} />
  );
}

export type WorkbenchTreeInteraction = 'default' | 'draggable' | 'dragging';

export interface WorkbenchTreeItemProps extends ComponentPropsWithRef<'div'> {
  actions?: ReactNode;
  control?: ReactNode;
  depth?: number;
  icon?: ReactNode;
  indentSize?: number;
  interaction?: WorkbenchTreeInteraction;
  label: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export const WorkbenchTreeItem = forwardRef<HTMLDivElement, WorkbenchTreeItemProps>(
  function WorkbenchTreeItem(
    {
      actions,
      children,
      className,
      control,
      depth = 0,
      icon,
      indentSize = 14,
      interaction = 'default',
      label,
      meta,
      role = 'treeitem',
      selected = false,
      style,
      tabIndex = 0,
      ...props
    },
    ref,
  ) {
    const itemStyle = {
      '--ui-workbench-tree-depth': depth,
      '--ui-workbench-tree-indent-offset': treeIndentOffset(depth, indentSize),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        aria-selected={selected}
        className={cx('ui-workbench-tree-item', className)}
        data-interaction={interaction}
        data-selected={selected ? 'true' : 'false'}
        role={role}
        style={itemStyle}
        tabIndex={tabIndex}
        {...props}
      >
        <span className="ui-workbench-tree-item__control">{control}</span>
        <span className="ui-workbench-tree-item__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="ui-workbench-tree-item__label">{label}</span>
        {meta ? <span className="ui-workbench-tree-item__meta">{meta}</span> : null}
        {actions ? <span className="ui-workbench-tree-item__actions">{actions}</span> : null}
        {children}
      </div>
    );
  },
);

export interface WorkbenchTreeExpanderProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  expanded?: boolean;
  label?: string;
  visible?: boolean;
}

function handleNestedTreeControlEvent<TEvent extends { stopPropagation(): void }>(
  event: TEvent,
  handler: ((event: TEvent) => void) | undefined,
) {
  event.stopPropagation();
  handler?.(event);
}

export function WorkbenchTreeExpander({
  className,
  disabled,
  expanded = false,
  label,
  onClick,
  onDoubleClick,
  onPointerDown,
  tabIndex,
  type = 'button',
  visible = true,
  ...props
}: WorkbenchTreeExpanderProps) {
  return (
    <button
      aria-expanded={visible ? expanded : undefined}
      aria-hidden={visible ? undefined : true}
      aria-label={visible ? label : undefined}
      className={cx('ui-workbench-tree-expander', className)}
      data-visible={visible ? 'true' : 'false'}
      disabled={!visible || disabled}
      onClick={(event) => handleNestedTreeControlEvent(event, onClick)}
      onDoubleClick={(event) => handleNestedTreeControlEvent(event, onDoubleClick)}
      onPointerDown={(event) => handleNestedTreeControlEvent(event, onPointerDown)}
      tabIndex={visible ? tabIndex : -1}
      type={type}
      {...props}
    >
      <i aria-hidden="true" className={cxCodicon(expanded ? 'chevron-down' : 'chevron-right')} />
    </button>
  );
}

export interface WorkbenchTreeActionButtonProps extends IconButtonProps {
  active?: boolean;
  tone?: 'default' | 'muted' | 'warning';
  visible?: boolean;
}

export function WorkbenchTreeActionButton({
  active = false,
  className,
  compact = true,
  onClick,
  onDoubleClick,
  onPointerDown,
  tabIndex,
  tone = 'default',
  visible = false,
  ...props
}: WorkbenchTreeActionButtonProps) {
  return (
    <IconButton
      className={cx('ui-workbench-tree-action', className)}
      compact={compact}
      data-active={active ? 'true' : 'false'}
      data-tone={tone}
      data-visible={visible ? 'true' : 'false'}
      onClick={(event) => handleNestedTreeControlEvent(event, onClick)}
      onDoubleClick={(event) => handleNestedTreeControlEvent(event, onDoubleClick)}
      onPointerDown={(event) => handleNestedTreeControlEvent(event, onPointerDown)}
      tabIndex={visible ? tabIndex : -1}
      {...props}
    />
  );
}

export interface WorkbenchTreeDropLineProps extends ComponentPropsWithRef<'div'> {
  position: 'above' | 'below';
}

export function WorkbenchTreeDropLine({
  className,
  position,
  ...props
}: WorkbenchTreeDropLineProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('ui-workbench-tree-drop-line', className)}
      data-position={position}
      {...props}
    />
  );
}

export interface WorkbenchTreeDropZoneProps extends ComponentPropsWithRef<'div'> {
  depth?: number;
  empty?: boolean;
  highlighted?: boolean;
  indentSize?: number;
}

export const WorkbenchTreeDropZone = forwardRef<HTMLDivElement, WorkbenchTreeDropZoneProps>(
  function WorkbenchTreeDropZone(
    { className, depth = 0, empty = false, highlighted = false, indentSize = 14, style, ...props },
    ref,
  ) {
    const zoneStyle = {
      '--ui-workbench-tree-depth': depth,
      '--ui-workbench-tree-indent-offset': treeIndentOffset(depth, indentSize),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={cx('ui-workbench-tree-drop-zone', className)}
        data-empty={empty ? 'true' : 'false'}
        data-highlighted={highlighted ? 'true' : 'false'}
        style={zoneStyle}
        {...props}
      />
    );
  },
);

export interface WorkbenchTreeDragOverlayProps extends ComponentPropsWithRef<'div'> {
  rowHeight?: number | string;
}

export function WorkbenchTreeDragOverlay({
  className,
  rowHeight,
  style,
  ...props
}: WorkbenchTreeDragOverlayProps) {
  const overlayStyle = {
    ...(rowHeight !== undefined
      ? { '--ui-workbench-tree-row-height': toLengthValue(rowHeight) }
      : null),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-tree-drag-overlay', className)}
      style={overlayStyle}
      {...props}
    />
  );
}

export interface WorkbenchDragPreviewProps extends ComponentPropsWithRef<'div'> {
  maxWidth?: number | string;
  offset?: number | string;
  x: number | string;
  y: number | string;
}

export function WorkbenchDragPreview({
  children,
  className,
  maxWidth = 160,
  offset = 8,
  style,
  x,
  y,
  ...props
}: WorkbenchDragPreviewProps) {
  const previewStyle = {
    '--ui-workbench-drag-preview-x': toLengthValue(x),
    '--ui-workbench-drag-preview-y': toLengthValue(y),
    '--ui-workbench-drag-preview-offset': toLengthValue(offset),
    '--ui-workbench-drag-preview-max-width': toLengthValue(maxWidth),
    ...style,
  } as CSSProperties;

  return (
    <div className={cx('ui-workbench-drag-preview', className)} style={previewStyle} {...props}>
      <span className="ui-workbench-drag-preview__label">{children}</span>
    </div>
  );
}

export type WorkbenchTemplateGlyphIcon =
  | 'badge'
  | 'color'
  | 'flex'
  | 'frame'
  | 'grid'
  | 'image'
  | 'list'
  | 'text';

export interface WorkbenchTemplateGlyphProps extends ComponentPropsWithRef<'span'> {
  accent: string;
  icon: WorkbenchTemplateGlyphIcon;
}

export function WorkbenchTemplateGlyph({
  accent,
  className,
  icon,
  style,
  ...props
}: WorkbenchTemplateGlyphProps) {
  const glyphStyle = {
    '--ui-workbench-template-glyph-accent': accent,
    ...style,
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className={cx('ui-workbench-template-glyph', className)}
      data-icon={icon}
      style={glyphStyle}
      {...props}
    >
      {icon === 'text' ? <span className="ui-workbench-template-glyph__text">T</span> : null}
      {icon === 'list'
        ? [0, 1, 2].map((index) => (
            <span key={index} className="ui-workbench-template-glyph__list-line" />
          ))
        : null}
      {icon === 'flex'
        ? [0, 1, 2].map((index) => (
            <span key={index} className="ui-workbench-template-glyph__flex-bar" />
          ))
        : null}
      {icon === 'image' ? <span className="ui-workbench-template-glyph__image-mark" /> : null}
      {icon === 'badge' ? <span className="ui-workbench-template-glyph__badge-mark" /> : null}
    </span>
  );
}

export type WorkbenchDividerProps = ComponentPropsWithRef<'div'>;

export function WorkbenchDivider({ className, ...props }: WorkbenchDividerProps) {
  return <div className={cx('ui-workbench-divider', className)} {...props} />;
}
