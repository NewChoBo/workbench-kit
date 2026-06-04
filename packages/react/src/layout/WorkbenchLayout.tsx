import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Field } from '../primitives/Field';
import type { FieldProps } from '../primitives/Field';
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

export type WorkbenchDividerProps = ComponentPropsWithRef<'div'>;

export function WorkbenchDivider({ className, ...props }: WorkbenchDividerProps) {
  return <div className={cx('ui-workbench-divider', className)} {...props} />;
}

export type WorkbenchPropertyRowProps = FieldProps;

export function WorkbenchPropertyRow({ className, ...props }: WorkbenchPropertyRowProps) {
  return <Field className={cx('ui-workbench-property-row', className)} {...props} />;
}

export type WorkbenchColorRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchColorRow({ className, ...props }: WorkbenchColorRowProps) {
  return <div className={cx('ui-workbench-color-row', className)} {...props} />;
}

export interface WorkbenchColorInputProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onChange'
> {
  fallbackValue?: string;
  onValueChange: (value: string) => void;
  value?: string | undefined;
}

export function WorkbenchColorInput({
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
        type="color"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <TextInput
        controlWidth="full"
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
