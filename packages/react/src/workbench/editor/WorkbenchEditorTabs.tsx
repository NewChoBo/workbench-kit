import { EditorTabs, type EditorTabsProps } from '../../primitives/workbench-editor';
import type { ContextMenuItem } from '../../overlay/ContextMenu';
import {
  useWorkbenchEditorTabContextMenu,
  type WorkbenchEditorTabCommandFocusDisposition,
  type WorkbenchEditorTabCommandFocusEvent,
} from './useWorkbenchEditorTabContextMenu';

export type {
  WorkbenchEditorTabCommandFocusDisposition,
  WorkbenchEditorTabCommandFocusEvent,
} from './useWorkbenchEditorTabContextMenu';

export interface WorkbenchEditorTabsProps extends EditorTabsProps {
  /** Additional host actions appended after the built-in close group. */
  readonly getExtraTabContextMenuItems?:
    ((tabId: string) => readonly ContextMenuItem[] | undefined) | undefined;
  /**
   * Optional bulk close. Defaults to calling `onClose` for every closable tab.
   */
  readonly onCloseAll?: (() => void) | undefined;
  /**
   * Optional close-others. Defaults to calling `onClose` for every other closable tab.
   */
  readonly onCloseOthers?: ((tabId: string) => void) | undefined;
  /** Optional close-to-right override. Defaults to closing each later closable tab. */
  readonly onCloseToRight?: ((tabId: string) => void) | undefined;
  /**
   * Optional host-readiness handshake for focus after a context-menu command. Omission preserves
   * the existing command-activation focus behavior.
   */
  readonly resolveContextMenuCommandFocus?:
    | ((
        event: WorkbenchEditorTabCommandFocusEvent,
      ) =>
        | WorkbenchEditorTabCommandFocusDisposition
        | PromiseLike<WorkbenchEditorTabCommandFocusDisposition>)
    | undefined;
}

/**
 * Editor tab strip with a built-in Close / Close others / Close to the right / Close all menu.
 * Intended for `WorkbenchStandaloneShell` secondary areas that own tab state in the host.
 * Tabs with `closable: false` keep Close disabled and are skipped by every bulk close action.
 */
export function WorkbenchEditorTabs({
  getExtraTabContextMenuItems,
  onClose,
  onCloseAll,
  onCloseOthers,
  onCloseToRight,
  onSelect,
  onTabContextMenu,
  resolveContextMenuCommandFocus,
  tabs,
  ...props
}: WorkbenchEditorTabsProps) {
  const tabContextMenu = useWorkbenchEditorTabContextMenu({
    getExtraTabContextMenuItems,
    onClose: onClose ?? (() => undefined),
    onCloseAll,
    onCloseOthers,
    onCloseToRight,
    onSelectTab: onSelect,
    resolveContextMenuCommandFocus,
    tabs,
  });

  return (
    <>
      <EditorTabs
        {...props}
        onClose={onClose}
        onSelect={tabContextMenu.onSelectTab}
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
