import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from 'react';

import { ContextMenu } from '../../overlay/ContextMenu';
import { IconButton } from '../../primitives/icon-button';
import type { WorkbenchSidebarSlotId } from '@workbench-kit/platform';
import { oppositeWorkbenchSidebarSlot } from '@workbench-kit/platform';

export interface SideBarViewTitleMenuProps {
  readonly currentSlot: WorkbenchSidebarSlotId;
  readonly menuAriaLabel: string;
  readonly menuButtonLabel: string;
  readonly moveToPrimaryLabel: string;
  readonly moveToSecondaryLabel: string;
  readonly onMoveToSlot?: ((targetSlot: WorkbenchSidebarSlotId) => void) | undefined;
  readonly viewId?: string | undefined;
}

export function SideBarViewTitleMenu({
  currentSlot,
  menuAriaLabel,
  menuButtonLabel,
  moveToPrimaryLabel,
  moveToSecondaryLabel,
  onMoveToSlot,
  viewId,
}: SideBarViewTitleMenuProps): ReactNode {
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const targetSlot = oppositeWorkbenchSidebarSlot(currentSlot);

  const openMenu = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left,
      y: rect.bottom + 4,
    });
  }, []);

  const moveView = useCallback((): void => {
    onMoveToSlot?.(targetSlot);
    setMenuPosition(null);
  }, [onMoveToSlot, targetSlot]);

  const menuItems = useMemo(
    () => [
      {
        id: 'move-view',
        label: targetSlot === 'secondary' ? moveToSecondaryLabel : moveToPrimaryLabel,
        onSelect: moveView,
        type: 'item' as const,
      },
    ],
    [moveToPrimaryLabel, moveToSecondaryLabel, moveView, targetSlot],
  );

  return (
    <>
      <IconButton
        compact
        data-side-bar-view-title-menu={viewId}
        icon="codicon-ellipsis"
        label={menuButtonLabel}
        onClick={openMenu}
      />
      {menuPosition ? (
        <ContextMenu
          ariaLabel={menuAriaLabel}
          items={menuItems}
          x={menuPosition.x}
          y={menuPosition.y}
          onClose={() => setMenuPosition(null)}
        />
      ) : null}
    </>
  );
}
