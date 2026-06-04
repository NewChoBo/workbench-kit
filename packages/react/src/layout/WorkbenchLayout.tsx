import { forwardRef } from 'react';
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { Button } from '../primitives/Button';
import type { ButtonProps } from '../primitives/Button';
import { Field } from '../primitives/Field';
import type { FieldProps } from '../primitives/Field';
import { IconButton } from '../primitives/IconButton';
import type { IconButtonProps } from '../primitives/IconButton';
import { TextInput } from '../primitives/TextInput';
import { cx } from '../utils/cx';

export type WorkbenchRootProps = ComponentPropsWithRef<'div'>;

export function WorkbenchRoot({ className, ...props }: WorkbenchRootProps) {
  return <div className={cx('ui-workbench-root', className)} {...props} />;
}

export type WorkbenchFillProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFill({ className, ...props }: WorkbenchFillProps) {
  return <div className={cx('ui-workbench-fill', className)} {...props} />;
}

export type WorkbenchCenterProps = ComponentPropsWithRef<'main'>;

export function WorkbenchCenter({ className, ...props }: WorkbenchCenterProps) {
  return <main className={cx('ui-workbench-center', className)} {...props} />;
}

export type WorkbenchPaneProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPane({ className, ...props }: WorkbenchPaneProps) {
  return <div className={cx('ui-workbench-pane', className)} {...props} />;
}

export type WorkbenchColumnProps = ComponentPropsWithRef<'div'>;

export function WorkbenchColumn({ className, ...props }: WorkbenchColumnProps) {
  return <div className={cx('ui-workbench-column', className)} {...props} />;
}

export interface WorkbenchPanelSurfaceProps extends ComponentPropsWithRef<'div'> {
  border?: 'left' | 'right' | false;
}

export function WorkbenchPanelSurface({
  border = false,
  className,
  ...props
}: WorkbenchPanelSurfaceProps) {
  return (
    <div
      className={cx(
        'ui-workbench-panel-surface',
        border === 'left' && 'ui-workbench-panel-surface--border-left',
        border === 'right' && 'ui-workbench-panel-surface--border-right',
        className,
      )}
      {...props}
    />
  );
}

export type WorkbenchPanelScrollProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPanelScroll({ className, ...props }: WorkbenchPanelScrollProps) {
  return <div className={cx('ui-workbench-panel-scroll', className)} {...props} />;
}

export interface WorkbenchBannerProps extends ComponentPropsWithRef<'div'> {
  tone?: 'default' | 'warning';
}

export function WorkbenchBanner({ className, tone = 'default', ...props }: WorkbenchBannerProps) {
  return (
    <div
      className={cx(
        'ui-workbench-banner',
        tone === 'warning' && 'ui-workbench-banner--warning',
        className,
      )}
      {...props}
    />
  );
}

export interface WorkbenchBannerIconProps extends ComponentPropsWithRef<'span'> {
  icon: string;
}

export function WorkbenchBannerIcon({ className, icon, ...props }: WorkbenchBannerIconProps) {
  return (
    <span
      className={cx('codicon', `codicon-${icon}`, 'ui-workbench-banner__icon', className)}
      aria-hidden
      {...props}
    />
  );
}

export type WorkbenchBannerMessageProps = ComponentPropsWithRef<'span'>;

export function WorkbenchBannerMessage({ className, ...props }: WorkbenchBannerMessageProps) {
  return <span className={cx('ui-workbench-banner__message', className)} {...props} />;
}

export type WorkbenchSectionTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchSectionTitle({ className, ...props }: WorkbenchSectionTitleProps) {
  return <div className={cx('ui-workbench-section-title', className)} {...props} />;
}

function toLengthValue(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value;
}

function treeIndentOffset(depth: number) {
  return `${8 + depth * 14}px`;
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
      '--ui-workbench-tree-indent-offset': treeIndentOffset(depth),
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

export function WorkbenchTreeExpander({
  className,
  disabled,
  expanded = false,
  label,
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
      tabIndex={visible ? tabIndex : -1}
      type={type}
      {...props}
    >
      <i
        aria-hidden="true"
        className={cx('codicon', expanded ? 'codicon-chevron-down' : 'codicon-chevron-right')}
      />
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
}

export const WorkbenchTreeDropZone = forwardRef<HTMLDivElement, WorkbenchTreeDropZoneProps>(
  function WorkbenchTreeDropZone(
    { className, depth = 0, empty = false, highlighted = false, style, ...props },
    ref,
  ) {
    const zoneStyle = {
      '--ui-workbench-tree-depth': depth,
      '--ui-workbench-tree-indent-offset': treeIndentOffset(depth),
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

export type WorkbenchTreeDragOverlayProps = ComponentPropsWithRef<'div'>;

export function WorkbenchTreeDragOverlay({ className, ...props }: WorkbenchTreeDragOverlayProps) {
  return <div className={cx('ui-workbench-tree-drag-overlay', className)} {...props} />;
}

export type WorkbenchDividerProps = ComponentPropsWithRef<'div'>;

export function WorkbenchDivider({ className, ...props }: WorkbenchDividerProps) {
  return <div className={cx('ui-workbench-divider', className)} {...props} />;
}

export type WorkbenchPropertyRowProps = FieldProps;

export function WorkbenchPropertyRow({ className, ...props }: WorkbenchPropertyRowProps) {
  return <Field className={cx('ui-workbench-property-row', className)} {...props} />;
}

export interface WorkbenchPropertyPanelProps extends ComponentPropsWithRef<'div'> {
  empty?: boolean;
}

export function WorkbenchPropertyPanel({
  className,
  empty = false,
  ...props
}: WorkbenchPropertyPanelProps) {
  return (
    <div
      className={cx(
        'ui-workbench-property-panel',
        empty && 'ui-workbench-property-panel--empty',
        className,
      )}
      {...props}
    />
  );
}

export interface WorkbenchPropertySectionProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'title'
> {
  actions?: ReactNode;
  bodyClassName?: string;
  title?: ReactNode;
}

export function WorkbenchPropertySection({
  actions,
  bodyClassName,
  children,
  className,
  title,
  ...props
}: WorkbenchPropertySectionProps) {
  return (
    <section className={cx('ui-workbench-property-section', className)} {...props}>
      {title || actions ? (
        <div className="ui-workbench-property-section__header">
          {title ? <WorkbenchSectionTitle>{title}</WorkbenchSectionTitle> : null}
          {actions ? <div className="ui-workbench-property-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx('ui-workbench-property-section__body', bodyClassName)}>{children}</div>
    </section>
  );
}

export interface WorkbenchPropertyStackProps extends ComponentPropsWithRef<'div'> {
  gap?: 'xs' | 'sm' | 'md' | 'lg';
}

export function WorkbenchPropertyStack({
  className,
  gap = 'md',
  ...props
}: WorkbenchPropertyStackProps) {
  return <div className={cx('ui-workbench-property-stack', className)} data-gap={gap} {...props} />;
}

export interface WorkbenchPropertyGridProps extends ComponentPropsWithRef<'div'> {
  columns?: 2 | 3;
  gap?: 'xs' | 'sm' | 'md';
}

export function WorkbenchPropertyGrid({
  className,
  columns = 2,
  gap = 'sm',
  ...props
}: WorkbenchPropertyGridProps) {
  return (
    <div
      className={cx('ui-workbench-property-grid', className)}
      data-columns={columns}
      data-gap={gap}
      {...props}
    />
  );
}

export interface WorkbenchPropertyInlineProps extends ComponentPropsWithRef<'div'> {
  justify?: 'start' | 'between';
}

export function WorkbenchPropertyInline({
  className,
  justify = 'start',
  ...props
}: WorkbenchPropertyInlineProps) {
  return (
    <div
      className={cx('ui-workbench-property-inline', className)}
      data-justify={justify}
      {...props}
    />
  );
}

export type WorkbenchPropertyHintProps = ComponentPropsWithRef<'span'>;

export function WorkbenchPropertyHint({ className, ...props }: WorkbenchPropertyHintProps) {
  return <span className={cx('ui-workbench-property-hint', className)} {...props} />;
}

export type WorkbenchPropertyCardProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPropertyCard({ className, ...props }: WorkbenchPropertyCardProps) {
  return <div className={cx('ui-workbench-property-card', className)} {...props} />;
}

export interface WorkbenchPropertyKeyValueProps extends ComponentPropsWithRef<'div'> {
  name: ReactNode;
  value: ReactNode;
}

export function WorkbenchPropertyKeyValue({
  className,
  name,
  value,
  ...props
}: WorkbenchPropertyKeyValueProps) {
  return (
    <div className={cx('ui-workbench-property-key-value', className)} {...props}>
      <span className="ui-workbench-property-key-value__name">{name}</span>
      <span className="ui-workbench-property-key-value__value">{value}</span>
    </div>
  );
}

export interface WorkbenchPropertyToggleButtonProps extends ButtonProps {
  active?: boolean;
}

export function WorkbenchPropertyToggleButton({
  active = false,
  className,
  compact = true,
  ...props
}: WorkbenchPropertyToggleButtonProps) {
  return (
    <Button
      className={cx('ui-workbench-property-toggle', className)}
      compact={compact}
      data-active={active ? 'true' : 'false'}
      {...props}
    />
  );
}

export type WorkbenchColorRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchColorRow({ className, ...props }: WorkbenchColorRowProps) {
  return <div className={cx('ui-workbench-color-row', className)} {...props} />;
}

export interface WorkbenchColorInputProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onChange'
> {
  disabled?: boolean | undefined;
  fallbackValue?: string;
  onValueChange: (value: string) => void;
  value?: string | undefined;
}

export function WorkbenchColorInput({
  disabled = false,
  fallbackValue = '#000000',
  onValueChange,
  value,
  ...props
}: WorkbenchColorInputProps) {
  const currentValue = value ?? fallbackValue;

  return (
    <WorkbenchColorRow {...props}>
      <TextInput
        className="ui-workbench-color-input"
        disabled={disabled}
        type="color"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <TextInput
        controlWidth="full"
        disabled={disabled}
        type="text"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </WorkbenchColorRow>
  );
}

export type WorkbenchParseErrorProps = ComponentPropsWithRef<'div'>;

export function WorkbenchParseError({ className, ...props }: WorkbenchParseErrorProps) {
  return <div className={cx('ui-workbench-parse-error', className)} {...props} />;
}

export interface WorkbenchPreviewCanvasProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: ReactNode;
  frameHeight: number;
  frameTitle?: ReactNode;
  frameWidth: number;
  help?: ReactNode;
  isPanning?: boolean;
  onResetView?: () => void;
  resetLabel?: ReactNode;
  resetTitle?: string;
  showWindowFrame?: boolean;
  stageStyle?: CSSProperties;
  viewportProps?: ComponentPropsWithRef<'div'>;
}

export function WorkbenchPreviewCanvas({
  children,
  className,
  frameHeight,
  frameTitle = 'Preview',
  frameWidth,
  help,
  isPanning = false,
  onResetView,
  resetLabel = 'Reset',
  resetTitle = 'Reset View',
  showWindowFrame = true,
  stageStyle,
  viewportProps,
  ...props
}: WorkbenchPreviewCanvasProps) {
  const { className: viewportClassName, ...restViewportProps } = viewportProps ?? {};

  return (
    <div className={cx('ui-workbench-preview-canvas', className)} {...props}>
      {onResetView ? (
        <Button
          compact
          className="ui-workbench-preview-canvas__reset"
          type="button"
          onClick={onResetView}
          title={resetTitle}
        >
          {resetLabel}
        </Button>
      ) : null}

      <div
        className="ui-workbench-preview-canvas__stage"
        data-panning={isPanning ? 'true' : 'false'}
        style={stageStyle}
      >
        <div
          className="ui-workbench-preview-canvas__frame"
          style={{
            width: frameWidth,
            height: frameHeight,
          }}
        >
          {showWindowFrame ? (
            <div className="ui-workbench-preview-canvas__titlebar">
              <div className="ui-workbench-preview-canvas__window-controls">
                <div className="ui-workbench-preview-canvas__dot" data-tone="close" />
                <div className="ui-workbench-preview-canvas__dot" data-tone="minimize" />
                <div className="ui-workbench-preview-canvas__dot" data-tone="maximize" />
              </div>
              <span className="ui-workbench-preview-canvas__title">{frameTitle}</span>
            </div>
          ) : null}
          <div
            className={cx('ui-workbench-preview-canvas__viewport', viewportClassName)}
            {...restViewportProps}
          >
            {children}
          </div>
        </div>
      </div>

      {help ? <div className="ui-workbench-preview-canvas__help">{help}</div> : null}
    </div>
  );
}
