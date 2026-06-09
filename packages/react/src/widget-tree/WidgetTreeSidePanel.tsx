import { useState, type ReactNode } from 'react';

import { SegmentedControl } from '../primitives/WorkbenchEditor.js';
import { cx } from '../utils/cx.js';

export type WidgetTreeSidePanelTab = 'outline' | 'assets' | 'properties';

export interface WidgetTreeSidePanelProps {
  readonly outline: ReactNode;
  readonly assets: ReactNode;
  readonly properties: ReactNode;
  readonly defaultTab?: WidgetTreeSidePanelTab | undefined;
}

export function WidgetTreeSidePanel({
  outline,
  assets,
  properties,
  defaultTab = 'outline',
}: WidgetTreeSidePanelProps) {
  const [tab, setTab] = useState<WidgetTreeSidePanelTab>(defaultTab);

  return (
    <section className="widget-tree-side-panel" data-testid="widget-tree-side-panel">
      <header className="widget-tree-side-panel__header">
        <SegmentedControl
          ariaLabel="Widget side panel"
          options={[
            { label: 'Outline', value: 'outline' },
            { label: 'Assets', value: 'assets' },
            { label: 'Props', value: 'properties' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </header>
      <div
        className={cx(
          'widget-tree-side-panel__body',
          tab === 'outline' && 'widget-tree-side-panel__body--outline',
          tab === 'assets' && 'widget-tree-side-panel__body--assets',
          tab === 'properties' && 'widget-tree-side-panel__body--properties',
        )}
      >
        {tab === 'outline' ? outline : tab === 'assets' ? assets : properties}
      </div>
    </section>
  );
}
