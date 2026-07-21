import type { ReactNode } from 'react';

/** @deprecated Side panel no longer switches tabs; all panes stay visible. */
export type WidgetTreeSidePanelTab = 'outline' | 'assets' | 'properties';
/** @deprecated Side panel no longer switches detail tabs. */
export type WidgetTreeSidePanelDetailTab = Exclude<WidgetTreeSidePanelTab, 'outline'>;

export interface WidgetTreeSidePanelProps {
  readonly outline: ReactNode;
  readonly properties: ReactNode;
}

/** Right authoring sidebar: widget tree (top) + properties (bottom). */
export function WidgetTreeSidePanel({ outline, properties }: WidgetTreeSidePanelProps) {
  return (
    <section
      aria-label="Widget tree side panel"
      className="widget-tree-side-panel"
      data-testid="widget-tree-side-panel"
    >
      <div
        aria-label="Widget outline"
        className="widget-tree-side-panel__outline"
        data-testid="widget-tree-side-panel-outline"
        role="region"
      >
        {outline}
      </div>
      <div
        aria-label="Widget properties"
        className="widget-tree-side-panel__properties"
        data-testid="widget-tree-side-panel-properties"
        role="region"
      >
        {properties}
      </div>
    </section>
  );
}
