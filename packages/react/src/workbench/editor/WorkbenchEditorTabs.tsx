import { EditorTabs, type EditorTabsProps } from '../../primitives/workbench-editor';
import { useWorkbenchEditorTabContextMenu } from './useWorkbenchEditorTabContextMenu';

export interface WorkbenchEditorTabsProps extends EditorTabsProps {
  /**
   * Optional bulk close. Defaults to calling `onClose` for every closable tab.
   */
  readonly onCloseAll?: (() => void) | undefined;
  /**
   * Optional close-others. Defaults to calling `onClose` for every other closable tab.
   */
  readonly onCloseOthers?: ((tabId: string) => void) | undefined;
}

/**
 * Editor tab strip with a built-in Close / Close others / Close all context menu.
 * Intended for `WorkbenchStandaloneShell` secondary areas that own tab state in the host.
 * Tabs with `closable: false` keep Close disabled and are skipped by Close others / Close all.
 */
export function WorkbenchEditorTabs({
  onClose,
  onCloseAll,
  onCloseOthers,
  onSelect,
  onTabContextMenu,
  tabs,
  ...props
}: WorkbenchEditorTabsProps) {
  const tabContextMenu = useWorkbenchEditorTabContextMenu({
    onClose: onClose ?? (() => undefined),
    onCloseAll,
    onCloseOthers,
    onSelectTab: onSelect,
    tabs,
  });

  return (
    <>
      <EditorTabs
        {...props}
        onClose={onClose}
        onSelect={onSelect}
        onTabContextMenu={(tabId, event) => {
          tabContextMenu.onTabContextMenu(tabId, event);
          onTabContextMenu?.(tabId, event);
        }}
        tabs={tabs}
      />
      {tabContextMenu.contextMenu}
    </>
  );
}
