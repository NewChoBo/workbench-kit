import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { ScrollArea } from '../primitives/ScrollArea';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { toLengthValue } from './layoutHelpers';

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
    <ScrollArea
      className={cx(
        'ui-workbench-panel-surface',
        border === 'left' && 'ui-workbench-panel-surface--border-left',
        border === 'right' && 'ui-workbench-panel-surface--border-right',
        className,
      )}
      gutter="auto"
      orientation="vertical"
      {...props}
    />
  );
}

export type WorkbenchPanelScrollProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPanelScroll({ className, ...props }: WorkbenchPanelScrollProps) {
  return (
    <ScrollArea
      className={cx('ui-workbench-panel-scroll', className)}
      gutter="auto"
      orientation="vertical"
      {...props}
    />
  );
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
      className={cxCodicon(icon, 'ui-workbench-banner__icon', className)}
      aria-hidden
      {...props}
    />
  );
}

export type WorkbenchBannerMessageProps = ComponentPropsWithRef<'span'>;

export function WorkbenchBannerMessage({ className, ...props }: WorkbenchBannerMessageProps) {
  return <span className={cx('ui-workbench-banner__message', className)} {...props} />;
}

export type WorkbenchEditorFrameProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorFrame({ className, ...props }: WorkbenchEditorFrameProps) {
  return <div className={cx('ui-workbench-editor-frame', className)} {...props} />;
}

export type WorkbenchEditorBodyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorBody({ className, ...props }: WorkbenchEditorBodyProps) {
  return <div className={cx('ui-workbench-editor-body', className)} {...props} />;
}

export type WorkbenchEditorViewportProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorViewport({ className, ...props }: WorkbenchEditorViewportProps) {
  return <div className={cx('ui-workbench-editor-viewport', className)} {...props} />;
}

export interface WorkbenchEditorBottomPanelProps extends ComponentPropsWithRef<'section'> {
  height?: number | string;
}

export function WorkbenchEditorBottomPanel({
  className,
  height = 120,
  style,
  ...props
}: WorkbenchEditorBottomPanelProps) {
  const panelStyle = {
    '--ui-workbench-editor-bottom-panel-height': toLengthValue(height),
    ...style,
  } as CSSProperties;

  return (
    <section
      className={cx('ui-workbench-editor-bottom-panel', className)}
      style={panelStyle}
      {...props}
    />
  );
}

export type WorkbenchEditorBottomPanelHeaderProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorBottomPanelHeader({
  className,
  ...props
}: WorkbenchEditorBottomPanelHeaderProps) {
  return <div className={cx('ui-workbench-editor-bottom-panel__header', className)} {...props} />;
}

export type WorkbenchEditorBottomPanelTitleProps = ComponentPropsWithRef<'span'>;

export function WorkbenchEditorBottomPanelTitle({
  className,
  ...props
}: WorkbenchEditorBottomPanelTitleProps) {
  return <span className={cx('ui-workbench-editor-bottom-panel__title', className)} {...props} />;
}

export type WorkbenchEditorBottomPanelBodyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorBottomPanelBody({
  className,
  ...props
}: WorkbenchEditorBottomPanelBodyProps) {
  return <div className={cx('ui-workbench-editor-bottom-panel__body', className)} {...props} />;
}

export type WorkbenchProblemSeverity = 'error' | 'info' | 'warning';

export type WorkbenchProblemListProps = ComponentPropsWithRef<'div'>;

export function WorkbenchProblemList({ className, ...props }: WorkbenchProblemListProps) {
  return <div className={cx('ui-workbench-problem-list', className)} {...props} />;
}

export interface WorkbenchProblemItemProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  location?: ReactNode;
  message: ReactNode;
  severity?: WorkbenchProblemSeverity;
}

export function WorkbenchProblemItem({
  className,
  location,
  message,
  severity = 'error',
  type = 'button',
  ...props
}: WorkbenchProblemItemProps) {
  return (
    <button
      className={cx('ui-workbench-problem-item', className)}
      data-severity={severity}
      type={type}
      {...props}
    >
      {location ? <span className="ui-workbench-problem-item__location">{location}</span> : null}
      <span className="ui-workbench-problem-item__message">{message}</span>
    </button>
  );
}

export type WorkbenchFloatingMenuAlign = 'end' | 'start';
export type WorkbenchFloatingMenuPlacement = 'bottom' | 'top';

export interface WorkbenchFloatingMenuProps extends ComponentPropsWithRef<'div'> {
  align?: WorkbenchFloatingMenuAlign;
  inset?: number | string;
  offset?: number | string;
  placement?: WorkbenchFloatingMenuPlacement;
  width?: number | string;
}

export function WorkbenchFloatingMenu({
  align = 'end',
  className,
  inset = 8,
  offset = 28,
  placement = 'top',
  role = 'menu',
  style,
  width = 180,
  ...props
}: WorkbenchFloatingMenuProps) {
  const menuStyle = {
    '--ui-workbench-floating-menu-inset': toLengthValue(inset),
    '--ui-workbench-floating-menu-offset': toLengthValue(offset),
    '--ui-workbench-floating-menu-width': toLengthValue(width),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-floating-menu', className)}
      data-align={align}
      data-placement={placement}
      role={role}
      style={menuStyle}
      {...props}
    />
  );
}

export interface WorkbenchFloatingMenuItemProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  icon?: ReactNode | string;
  label: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export function WorkbenchFloatingMenuItem({
  className,
  icon,
  label,
  meta,
  role = 'menuitem',
  selected = false,
  type = 'button',
  ...props
}: WorkbenchFloatingMenuItemProps) {
  const resolvedIcon = typeof icon === 'string' ? <i className={cxCodicon(icon)} /> : icon;

  return (
    <button
      className={cx('ui-workbench-floating-menu__item', className)}
      data-selected={selected ? 'true' : 'false'}
      role={role}
      type={type}
      {...props}
    >
      <span className="ui-workbench-floating-menu__icon">{resolvedIcon}</span>
      <span className="ui-workbench-floating-menu__label">{label}</span>
      {meta ? <span className="ui-workbench-floating-menu__meta">{meta}</span> : null}
    </button>
  );
}
