import type { ReactNode } from 'react';

import {
  WorkbenchEditorBody,
  WorkbenchEditorFrame,
  WorkbenchPanelSurface,
  type WorkbenchEditorBodyProps,
  type WorkbenchEditorFrameProps,
  type WorkbenchPanelSurfaceProps,
} from '../layout/WorkbenchLayoutBase';
import { EmptyState, type EmptyStateProps } from '../primitives/EmptyState';

export type WorkbenchViewEditorDataAttributes = {
  readonly [key: `data-${string}`]: boolean | number | string | undefined;
};

export type WorkbenchViewEditorEmptyStateProps = Omit<EmptyStateProps, 'children' | 'icon'> &
  WorkbenchViewEditorDataAttributes;

export type WorkbenchViewEditorEmptyStateSurfaceProps = Omit<
  WorkbenchPanelSurfaceProps,
  'children'
> &
  WorkbenchViewEditorDataAttributes;

export interface WorkbenchViewEditorEmptyState {
  readonly children: ReactNode;
  readonly icon: EmptyStateProps['icon'];
  readonly props?: WorkbenchViewEditorEmptyStateProps | undefined;
  readonly surfaceProps?: WorkbenchViewEditorEmptyStateSurfaceProps | undefined;
}

export interface WorkbenchViewEditorProps extends Omit<WorkbenchEditorFrameProps, 'children'> {
  readonly bodyProps?: Omit<WorkbenchEditorBodyProps, 'children'> | undefined;
  readonly children?: ReactNode;
  readonly emptyState?: WorkbenchViewEditorEmptyState | undefined;
  readonly tabs?: ReactNode | undefined;
}

export function WorkbenchViewEditor({
  bodyProps,
  children,
  emptyState,
  tabs,
  ...frameProps
}: WorkbenchViewEditorProps) {
  const bodyContent =
    children !== undefined
      ? children
      : emptyState === undefined
        ? null
        : renderWorkbenchViewEditorEmptyState(emptyState);

  return (
    <WorkbenchEditorFrame {...frameProps}>
      {tabs}
      <WorkbenchEditorBody {...bodyProps}>{bodyContent}</WorkbenchEditorBody>
    </WorkbenchEditorFrame>
  );
}

function renderWorkbenchViewEditorEmptyState({
  children,
  icon,
  props,
  surfaceProps,
}: WorkbenchViewEditorEmptyState) {
  return (
    <WorkbenchPanelSurface {...surfaceProps}>
      <EmptyState icon={icon} {...props}>
        {children}
      </EmptyState>
    </WorkbenchPanelSurface>
  );
}
