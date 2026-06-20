import { useId, useState, type FormEventHandler, type ReactNode } from 'react';
import { Modal } from '../../modal/Modal';
import type { ModalProps } from '../../modal/Modal';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { cx } from '../../utils/cx';
import { WorkbenchNavigationPanel } from './NavigationPanel';
import { WorkbenchSettingsNav } from './WorkbenchSettingsNav';
import type { WorkbenchSettingsCategory, WorkbenchSettingsScope } from './types';

export interface WorkbenchSettingsModalProps extends Pick<
  ModalProps,
  | 'className'
  | 'closeLabel'
  | 'footer'
  | 'labelledBy'
  | 'minHeight'
  | 'minWidth'
  | 'onClose'
  | 'title'
  | 'titleSuffix'
> {
  categories: WorkbenchSettingsCategory[];
  activeCategoryId?: string;
  activeScopeId?: string;
  bodyClassName?: string;
  defaultActiveCategoryId?: string;
  defaultActiveScopeId?: string;
  defaultSearchValue?: string;
  emptyContent?: ReactNode;
  onActiveCategoryIdChange?: (categoryId: string) => void;
  onScopeChange?: (scopeId: string) => void;
  onSearchValueChange?: (value: string) => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  renderCategory?: (category: WorkbenchSettingsCategory) => ReactNode;
  scopes?: WorkbenchSettingsScope[];
  searchPlaceholder?: string;
  searchValue?: string;
  showSearch?: boolean;
}

function firstEnabledCategory(categories: WorkbenchSettingsCategory[]) {
  return categories.find((category) => !category.disabled) ?? categories[0];
}

function resolveCategoryId(
  categories: WorkbenchSettingsCategory[],
  preferredCategoryId: string | undefined,
) {
  const preferredCategory = categories.find(
    (category) => category.id === preferredCategoryId && !category.disabled,
  );

  return preferredCategory?.id ?? firstEnabledCategory(categories)?.id ?? '';
}

function firstEnabledScope(scopes: WorkbenchSettingsScope[] | undefined) {
  return scopes?.find((scope) => !scope.disabled) ?? scopes?.[0];
}

export function WorkbenchSettingsModal({
  activeCategoryId,
  activeScopeId,
  bodyClassName,
  categories,
  className,
  closeLabel = 'Close settings',
  defaultActiveCategoryId,
  defaultActiveScopeId,
  defaultSearchValue = '',
  emptyContent = null,
  footer,
  labelledBy,
  minHeight,
  minWidth,
  onActiveCategoryIdChange,
  onClose,
  onScopeChange,
  onSearchValueChange,
  onSubmit,
  renderCategory,
  scopes,
  searchPlaceholder = 'Search settings',
  searchValue,
  showSearch = true,
  title,
  titleSuffix,
}: WorkbenchSettingsModalProps) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = labelledBy ?? `${generatedId}-settings-title`;
  const [uncontrolledCategoryId, setUncontrolledCategoryId] = useState(
    () => defaultActiveCategoryId ?? firstEnabledCategory(categories)?.id ?? '',
  );
  const [uncontrolledScopeId, setUncontrolledScopeId] = useState(
    () => defaultActiveScopeId ?? firstEnabledScope(scopes)?.id ?? '',
  );
  const [uncontrolledSearchValue, setUncontrolledSearchValue] = useState(defaultSearchValue);
  const selectedCategoryId = resolveCategoryId(
    categories,
    activeCategoryId ?? uncontrolledCategoryId,
  );
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedScopeId =
    activeScopeId ?? uncontrolledScopeId ?? firstEnabledScope(scopes)?.id ?? '';
  const resolvedSearchValue = searchValue ?? uncontrolledSearchValue;

  const handleSelectCategory = (categoryId: string) => {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (!category || category.disabled) return;

    if (activeCategoryId === undefined) {
      setUncontrolledCategoryId(categoryId);
    }

    onActiveCategoryIdChange?.(categoryId);
  };

  const handleSelectScope = (scopeId: string) => {
    const scope = scopes?.find((candidate) => candidate.id === scopeId);
    if (!scope || scope.disabled) return;

    if (activeScopeId === undefined) {
      setUncontrolledScopeId(scopeId);
    }

    onScopeChange?.(scopeId);
  };

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) {
      setUncontrolledSearchValue(value);
    }

    onSearchValueChange?.(value);
  };

  return (
    <Modal
      className={cx('workbench-settings-modal', className)}
      bodyClassName={cx('workbench-settings-modal__body', bodyClassName)}
      closeLabel={closeLabel}
      footer={footer}
      labelledBy={titleId}
      minHeight={minHeight}
      minWidth={minWidth}
      title={title}
      titleSuffix={titleSuffix}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      {showSearch ? (
        <div className="workbench-settings-search">
          <ClearableTextInput
            aria-label={searchPlaceholder}
            clearLabel="Clear settings search"
            controlWidth="full"
            placeholder={searchPlaceholder}
            value={resolvedSearchValue}
            onClear={() => handleSearchChange('')}
            onChange={(event) => handleSearchChange(event.currentTarget.value)}
          />
        </div>
      ) : null}

      {scopes?.length ? (
        <div className="workbench-settings-tabs" aria-label="Settings scope">
          {scopes.map((scope) => {
            const isActive = scope.id === selectedScopeId;

            return (
              <button
                key={scope.id}
                type="button"
                className={cx(
                  'workbench-settings-tab',
                  isActive && 'workbench-settings-tab--active',
                )}
                disabled={scope.disabled}
                title={scope.title}
                onClick={() => handleSelectScope(scope.id)}
              >
                {scope.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <WorkbenchNavigationPanel
        className="workbench-settings-layout"
        content={
          selectedCategory
            ? (renderCategory?.(selectedCategory) ?? selectedCategory.content ?? emptyContent)
            : emptyContent
        }
        contentClassName="workbench-settings-content"
        nav={
          <WorkbenchSettingsNav
            activeCategoryId={selectedCategoryId}
            categories={categories}
            renderContainer={false}
            onSelectCategory={handleSelectCategory}
          />
        }
        navClassName="workbench-settings-sidebar"
        navProps={{ 'aria-label': 'Settings categories' }}
      />
    </Modal>
  );
}
