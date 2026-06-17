import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../utils/cx';
import type { WorkbenchSettingsCategory } from './types';

export interface WorkbenchSettingsNavProps extends Omit<
  ComponentPropsWithRef<'aside'>,
  'children' | 'onSelect'
> {
  activeCategoryId: string;
  categories: WorkbenchSettingsCategory[];
  ariaLabel?: string;
  onSelectCategory: (categoryId: string) => void;
  renderContainer?: boolean | undefined;
}

export function WorkbenchSettingsNav({
  activeCategoryId,
  ariaLabel = 'Settings categories',
  categories,
  className,
  onSelectCategory,
  renderContainer = true,
  ...props
}: WorkbenchSettingsNavProps) {
  const items = categories.map((category) => {
    const isActive = category.id === activeCategoryId;

    return (
      <button
        key={category.id}
        type="button"
        className={cx(
          'workbench-settings-nav-item',
          isActive && 'workbench-settings-nav-item--active',
        )}
        aria-current={isActive ? 'page' : undefined}
        disabled={category.disabled}
        title={category.title}
        onClick={() => onSelectCategory(category.id)}
      >
        {category.label}
      </button>
    );
  });

  if (!renderContainer) return <>{items}</>;

  return (
    <aside
      className={cx('workbench-settings-sidebar', 'ui-workbench-scrollbar', className)}
      aria-label={ariaLabel}
      {...props}
    >
      {items}
    </aside>
  );
}
