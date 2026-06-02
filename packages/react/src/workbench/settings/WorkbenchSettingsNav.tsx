import { cx } from '../../utils/cx';
import type { WorkbenchSettingsCategory } from './types';

export interface WorkbenchSettingsNavProps {
  activeCategoryId: string;
  categories: WorkbenchSettingsCategory[];
  ariaLabel?: string;
  onSelectCategory: (categoryId: string) => void;
}

export function WorkbenchSettingsNav({
  activeCategoryId,
  ariaLabel = 'Settings categories',
  categories,
  onSelectCategory,
}: WorkbenchSettingsNavProps) {
  return (
    <aside className="workbench-settings-sidebar" aria-label={ariaLabel}>
      {categories.map((category) => {
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
      })}
    </aside>
  );
}
