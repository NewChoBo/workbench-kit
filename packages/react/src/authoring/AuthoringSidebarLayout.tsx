import type { ReactNode } from 'react';

import { SplitView } from '../workbench/SplitView.js';
import {
  movePanelToSide,
  type AuthoringPanelDefinition,
  type AuthoringPanelId,
  type AuthoringSidebarPlacement,
} from './authoring-sidebar.js';
import { WidgetEditorSidePanel, type WidgetEditorSidePanelTab } from './WidgetEditorSidePanel.js';

export interface AuthoringSidebarLayoutProps {
  center: ReactNode;
  onPlacementChange?: ((placement: AuthoringSidebarPlacement) => void) | undefined;
  panels: Readonly<Record<string, AuthoringPanelDefinition>>;
  placement: AuthoringSidebarPlacement;
  showMoveControls?: boolean | undefined;
}

function toSidePanelTabs(
  panelIds: readonly AuthoringPanelId[],
  panels: Readonly<Record<string, AuthoringPanelDefinition>>,
): WidgetEditorSidePanelTab[] {
  return panelIds
    .map((id) => panels[id])
    .filter((panel): panel is AuthoringPanelDefinition => panel !== undefined)
    .map((panel) => ({
      id: panel.id,
      label: panel.label,
      content: panel.content,
    }));
}

export function AuthoringSidebarLayout({
  center,
  onPlacementChange,
  panels,
  placement,
  showMoveControls = false,
}: AuthoringSidebarLayoutProps) {
  const leftTabs = toSidePanelTabs(placement.left, panels);
  const rightTabs = toSidePanelTabs(placement.right, panels);

  const handleMoveTab = (tabId: string, fromSide: 'left' | 'right') => {
    const targetSide = fromSide === 'left' ? 'right' : 'left';
    onPlacementChange?.(movePanelToSide(placement, tabId, targetSide));
  };

  let content = center;

  if (rightTabs.length > 0) {
    content = (
      <SplitView
        className="ui-json-widget-editor__right-sidebar-split"
        defaultPrimarySizePercent={72}
        minPrimarySizePercent={50}
        primary={content}
        secondary={
          <section className="ui-json-widget-editor__pane" aria-label="Right sidebar">
            <WidgetEditorSidePanel
              panelTestId="widget-right-side-panel"
              side="right"
              tabs={rightTabs}
              onMoveActiveTab={
                showMoveControls && onPlacementChange
                  ? (tabId) => handleMoveTab(tabId, 'right')
                  : undefined
              }
            />
          </section>
        }
      />
    );
  }

  if (leftTabs.length > 0) {
    content = (
      <SplitView
        className="ui-json-widget-editor__add-panel-split"
        defaultPrimarySizePercent={leftTabs.some((tab) => tab.id === 'tree') ? 22 : 16}
        minPrimarySizePercent={12}
        maxPrimarySizePercent={leftTabs.some((tab) => tab.id === 'tree') ? 35 : 26}
        primary={
          <section className="ui-json-widget-editor__pane" aria-label="Left sidebar">
            <WidgetEditorSidePanel
              defaultTabId={leftTabs[0]?.id}
              panelTestId="widget-add-side-panel"
              side="left"
              tabs={leftTabs}
              onMoveActiveTab={
                showMoveControls && onPlacementChange
                  ? (tabId) => handleMoveTab(tabId, 'left')
                  : undefined
              }
            />
          </section>
        }
        secondary={content}
      />
    );
  }

  return content;
}
