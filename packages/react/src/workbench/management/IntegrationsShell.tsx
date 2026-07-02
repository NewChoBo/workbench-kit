import type { ReactNode } from 'react';
import { PanelHeader } from '../../layout/Panel';
import { WorkbenchEditorFrame, WorkbenchPanelScroll } from '../../layout/WorkbenchLayoutBase';
import { WorkbenchPropertyHint } from '../../layout/WorkbenchPropertyPanel';
import { SplitView } from '../SplitView';

export interface IntegrationsShellProps {
  children: ReactNode;
  detailDataAttributes?: Record<string, string> | undefined;
  primaryDataAttributes?: Record<string, string> | undefined;
  rootDataAttributes?: Record<string, string> | undefined;
  sidebar: ReactNode;
  sourceDescription: string;
  sourceTitle: string;
  sourceTitleTooltip?: string | undefined;
}

export function IntegrationsShell({
  children,
  detailDataAttributes,
  primaryDataAttributes,
  rootDataAttributes,
  sidebar,
  sourceDescription,
  sourceTitle,
  sourceTitleTooltip,
}: IntegrationsShellProps) {
  return (
    <WorkbenchEditorFrame className="workbench-integrations-shell" {...(rootDataAttributes ?? {})}>
      <SplitView
        defaultPrimarySizePercent={28}
        maxPrimarySizePercent={40}
        minPrimarySizePercent={20}
        primary={
          <div className="workbench-primary-side-bar" {...(primaryDataAttributes ?? {})}>
            {sidebar}
          </div>
        }
        secondary={
          <section className="workbench-editor-area" {...(detailDataAttributes ?? {})}>
            <PanelHeader>
              <span className="block min-w-0 truncate" title={sourceTitleTooltip}>
                {sourceTitle}
              </span>
              <WorkbenchPropertyHint>{sourceDescription}</WorkbenchPropertyHint>
            </PanelHeader>
            <WorkbenchPanelScroll>{children}</WorkbenchPanelScroll>
          </section>
        }
      />
    </WorkbenchEditorFrame>
  );
}
