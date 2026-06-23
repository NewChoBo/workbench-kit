import { useState, type ReactNode } from 'react';

import { SegmentedControl } from '../primitives/WorkbenchEditor.js';
import { cx } from '../utils/cx.js';

export type WidgetTreeSidePanelTab = 'outline' | 'assets' | 'properties';
export type WidgetTreeSidePanelDetailTab = Exclude<WidgetTreeSidePanelTab, 'outline'>;

const WIDGET_TREE_DETAIL_TABS = [
  { label: 'Props', value: 'properties' },
  { label: 'Assets', value: 'assets' },
] as const satisfies ReadonlyArray<{
  readonly label: string;
  readonly value: WidgetTreeSidePanelDetailTab;
}>;

function resolveWidgetTreeDetailTab(tab: WidgetTreeSidePanelTab): WidgetTreeSidePanelDetailTab {
  return tab === 'assets' ? 'assets' : 'properties';
}

export interface WidgetTreeSidePanelProps {
  readonly outline: ReactNode;
  readonly assets: ReactNode;
  readonly properties: ReactNode;
  readonly defaultTab?: WidgetTreeSidePanelTab | undefined;
  readonly detailTab?: WidgetTreeSidePanelDetailTab | undefined;
  readonly onDetailTabChange?: ((tab: WidgetTreeSidePanelDetailTab) => void) | undefined;
}

export function WidgetTreeSidePanel({
  outline,
  assets,
  properties,
  defaultTab = 'outline',
  detailTab,
  onDetailTabChange,
}: WidgetTreeSidePanelProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<WidgetTreeSidePanelDetailTab>(() =>
    resolveWidgetTreeDetailTab(defaultTab),
  );
  const tab = detailTab ?? uncontrolledTab;

  const setTab = (nextTab: WidgetTreeSidePanelDetailTab) => {
    if (detailTab === undefined) {
      setUncontrolledTab(nextTab);
    }
    onDetailTabChange?.(nextTab);
  };

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
      <div aria-label="Widget details" className="widget-tree-side-panel__detail" role="region">
        <header className="widget-tree-side-panel__header">
          <SegmentedControl
            ariaLabel="Widget side panel detail"
            options={WIDGET_TREE_DETAIL_TABS}
            value={tab}
            onChange={setTab}
          />
        </header>
        <div
          className={cx(
            'widget-tree-side-panel__body',
            tab === 'assets' && 'widget-tree-side-panel__body--assets',
            tab === 'properties' && 'widget-tree-side-panel__body--properties',
          )}
        >
          {tab === 'assets' ? assets : properties}
        </div>
      </div>
    </section>
  );
}
