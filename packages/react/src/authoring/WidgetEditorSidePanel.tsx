import { useState, type ReactNode } from 'react';

import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/WorkbenchEditor';

export interface WidgetEditorSidePanelTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface WidgetEditorSidePanelProps {
  defaultTabId?: string | undefined;
  onMoveActiveTab?: ((tabId: string) => void) | undefined;
  panelTestId?: string | undefined;
  side?: 'left' | 'right' | undefined;
  tabs: readonly WidgetEditorSidePanelTab[];
}

export function WidgetEditorSidePanel({
  defaultTabId,
  onMoveActiveTab,
  panelTestId = 'widget-editor-side-panel',
  side,
  tabs,
}: WidgetEditorSidePanelProps) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId ?? tabs[0]?.id ?? 'inspector');

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) return null;

  const moveTargetSide = side === 'left' ? 'right' : 'left';
  const showHeader = tabs.length > 1 || onMoveActiveTab !== undefined;

  return (
    <div
      className="ui-widget-editor-side-panel"
      data-tab-count={tabs.length > 1 ? 'multi' : 'single'}
      data-testid={panelTestId}
    >
      {showHeader ? (
        <div className="ui-widget-editor-side-panel__header">
          {tabs.length > 1 ? (
            <div className="ui-widget-editor-side-panel__tabs">
              <SegmentedControl
                ariaLabel="Side panel"
                options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
                value={activeTabId}
                onChange={setActiveTabId}
              />
            </div>
          ) : (
            <span className="ui-widget-editor-side-panel__single-title">{activeTab.label}</span>
          )}
          {onMoveActiveTab ? (
            <div className="ui-widget-editor-side-panel__actions">
              <Button
                compact
                data-testid={`move-panel-to-${moveTargetSide}`}
                title={`Move ${activeTab.label} to ${moveTargetSide} sidebar`}
                onClick={() => onMoveActiveTab(activeTabId)}
              >
                Move to {moveTargetSide}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="ui-widget-editor-side-panel__body">{activeTab.content}</div>
    </div>
  );
}
