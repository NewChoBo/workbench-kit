import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { ScrollArea } from '../primitives/ScrollArea';
import { cx } from '../utils/cx';

export type PanelProps = ComponentPropsWithRef<'div'>;

export function Panel({ className, ...props }: PanelProps) {
  return <div className={cx('ide-panel', className)} {...props} />;
}

export interface PanelHeaderProps extends ComponentPropsWithRef<'div'> {
  actions?: ReactNode;
}

export function PanelHeader({ actions, children, className, ...props }: PanelHeaderProps) {
  return (
    <div className={cx('panel-header', className)} {...props}>
      <span className="ui-panel-header__title">{children}</span>
      {actions ? <span className="ui-panel-header__actions">{actions}</span> : null}
    </div>
  );
}

export type PanelBodyProps = ComponentPropsWithRef<'div'>;

export function PanelBody({ className, ...props }: PanelBodyProps) {
  return (
    <ScrollArea
      className={cx('panel-body', 'ui-panel-body', className)}
      orientation="both"
      {...props}
    />
  );
}

export type PanelFooterProps = ComponentPropsWithRef<'div'>;

export function PanelFooter({ className, ...props }: PanelFooterProps) {
  return <div className={cx('ui-panel-footer', className)} {...props} />;
}

export type FilterBarProps = ComponentPropsWithRef<'div'>;

export function FilterBar({ className, ...props }: FilterBarProps) {
  return <div className={cx('ui-filter-bar', className)} {...props} />;
}

export type FilterBarRowProps = ComponentPropsWithRef<'div'>;

export function FilterBarRow({ className, ...props }: FilterBarRowProps) {
  return <div className={cx('ui-filter-bar__row', className)} {...props} />;
}

export interface FilterChipProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  count?: number | undefined;
  label: ReactNode;
  onDismiss?: (() => void) | undefined;
}

export function FilterChip({
  className,
  count,
  label,
  onDismiss,
  type = 'button',
  ...props
}: FilterChipProps) {
  return (
    <Button className={cx('ui-filter-chip', className)} type={type} {...props}>
      <span className="ui-filter-chip__label">{label}</span>
      {count !== undefined ? <span className="ui-filter-chip__count">{count}</span> : null}
      {onDismiss ? (
        <span
          aria-hidden={true}
          className="ui-filter-chip__dismiss"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <i className="codicon codicon-close" />
        </span>
      ) : null}
    </Button>
  );
}

export interface FilterBarActiveChipsProps extends ComponentPropsWithRef<'div'> {
  clearAllLabel?: string | undefined;
  onClearAll?: (() => void) | undefined;
}

export function FilterBarActiveChips({
  children,
  className,
  clearAllLabel = 'Clear all',
  onClearAll,
  ...props
}: FilterBarActiveChipsProps) {
  return (
    <FilterBarRow className={cx('ui-filter-bar__active-chips', className)} {...props}>
      <div className="ui-filter-bar__chip-list" role="list">
        {children}
      </div>
      {onClearAll ? (
        <Button className="ui-filter-bar__clear-all" onClick={onClearAll}>
          {clearAllLabel}
        </Button>
      ) : null}
    </FilterBarRow>
  );
}

export interface HelpTextProps extends ComponentPropsWithRef<'div'> {
  tone?: 'error' | 'normal';
}

export function HelpText({ className, tone = 'normal', ...props }: HelpTextProps) {
  return (
    <div
      className={cx('ui-help-text', tone === 'error' && 'ui-help-text--error', className)}
      {...props}
    />
  );
}

export type PreviewPaneProps = ComponentPropsWithRef<'div'>;

export function PreviewPane({ className, ...props }: PreviewPaneProps) {
  return <div className={cx('ui-preview-pane', className)} {...props} />;
}

export type PreviewPaneContentProps = ComponentPropsWithRef<'div'>;

export function PreviewPaneContent({ className, ...props }: PreviewPaneContentProps) {
  return <div className={cx('ui-preview-pane__content', className)} {...props} />;
}

export type PreviewPaneViewportProps = ComponentPropsWithRef<'div'>;

export function PreviewPaneViewport({ className, ...props }: PreviewPaneViewportProps) {
  return <div className={cx('ui-preview-pane__viewport', className)} {...props} />;
}

export type PreviewPaneDetailsProps = ComponentPropsWithRef<'div'>;

export function PreviewPaneDetails({ className, ...props }: PreviewPaneDetailsProps) {
  return <div className={cx('ui-preview-pane__details', className)} {...props} />;
}

export type PreviewPaneTitleProps = ComponentPropsWithRef<'div'>;

export function PreviewPaneTitle({ className, ...props }: PreviewPaneTitleProps) {
  return <div className={cx('ui-preview-pane__title', className)} {...props} />;
}

export interface PreviewPaneTextProps extends ComponentPropsWithRef<'div'> {
  tone?: 'error' | 'normal';
}

export function PreviewPaneText({ className, tone = 'normal', ...props }: PreviewPaneTextProps) {
  return (
    <div
      className={cx(
        'ui-preview-pane__text',
        tone === 'error' && 'ui-preview-pane__text--error',
        className,
      )}
      {...props}
    />
  );
}
