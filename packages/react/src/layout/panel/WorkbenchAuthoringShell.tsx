import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { WorkbenchFill, WorkbenchFillChain } from '../WorkbenchLayoutBase';

import './workbench-authoring-shell.css';

export interface WorkbenchAuthoringShellProps extends ComponentPropsWithRef<'div'> {
  readonly toolbar?: ReactNode | undefined;
}

/**
 * Column fill shell for document authoring surfaces (toolbar + body).
 * Owns layout chrome so callers do not sprinkle fill/toolbar BEM classes.
 */
export function WorkbenchAuthoringShell({
  children,
  className,
  toolbar,
  ...props
}: WorkbenchAuthoringShellProps) {
  return (
    <WorkbenchFillChain className={cx('ui-workbench-authoring-shell', className)} {...props}>
      {toolbar ? <WorkbenchSurfaceToolbar>{toolbar}</WorkbenchSurfaceToolbar> : null}
      <WorkbenchFill className="ui-workbench-authoring-shell__body">{children}</WorkbenchFill>
    </WorkbenchFillChain>
  );
}

export type WorkbenchSurfaceToolbarProps = ComponentPropsWithRef<'div'>;

export function WorkbenchSurfaceToolbar({ className, ...props }: WorkbenchSurfaceToolbarProps) {
  return <div className={cx('ui-workbench-surface-toolbar', className)} {...props} />;
}

export type WorkbenchSurfaceMetaProps = ComponentPropsWithRef<'p'>;

export function WorkbenchSurfaceMeta({ className, ...props }: WorkbenchSurfaceMetaProps) {
  return <p className={cx('ui-workbench-surface-meta', className)} {...props} />;
}

export type WorkbenchPlainTextSourceProps = ComponentPropsWithRef<'textarea'>;

/** Full-pane monospace document/source editor. */
export function WorkbenchPlainTextSource({
  className,
  spellCheck = false,
  ...props
}: WorkbenchPlainTextSourceProps) {
  return (
    <textarea
      className={cx('ui-workbench-plain-text-source', className)}
      spellCheck={spellCheck}
      {...props}
    />
  );
}
