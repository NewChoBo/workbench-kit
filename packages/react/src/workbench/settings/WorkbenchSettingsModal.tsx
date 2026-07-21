import { useId, useMemo, useState, type FormEventHandler, type ReactNode } from 'react';
import { Modal } from '../../modal/Modal';
import type { ModalProps } from '../../modal/Modal';
import { Button } from '../../primitives/button';
import { ClearableTextInput } from '../../primitives/clearable-text-input';
import { cx } from '../../utils/cx';
import { WorkbenchNavigationPanel } from './NavigationPanel';
import {
  WorkbenchSettingsCommitProvider,
  type WorkbenchSettingsCommitMode,
  type WorkbenchSettingsPreferenceChange,
} from './settingsCommit';
import { WorkbenchSettingsNav } from './WorkbenchSettingsNav';
import type { WorkbenchSettingsCategory, WorkbenchSettingsScope } from './types';

export type { WorkbenchSettingsCommitMode, WorkbenchSettingsPreferenceChange };

export interface WorkbenchSettingsModalProps extends Pick<
  ModalProps,
  | 'chrome'
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
  /**
   * How preference edits are committed.
   *
   * - `explicit` (default): keep the host-provided footer (typically Apply/Cancel) and `onSubmit`.
   * - `immediate`: omit the footer and rely on per-field commits via `onPreferenceChange`
   *   (or {@link useWorkbenchSettingsCommit} inside category content).
   */
  commitMode?: WorkbenchSettingsCommitMode;
  defaultActiveCategoryId?: string;
  defaultActiveScopeId?: string;
  defaultSearchValue?: string;
  emptyContent?: ReactNode;
  onActiveCategoryIdChange?: (categoryId: string) => void;
  /**
   * Called when category content commits a preference while `commitMode` is `immediate`.
   * {@link WorkbenchSchemaForm} wires this automatically; custom fields should call
   * {@link useWorkbenchSettingsCommit}.
   */
  onPreferenceChange?: (change: WorkbenchSettingsPreferenceChange) => void;
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
  chrome = 'platform',
  className,
  closeLabel = 'Close settings',
  commitMode = 'explicit',
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
  onPreferenceChange,
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
  const isImmediateCommit = commitMode === 'immediate';
  const resolvedFooter = isImmediateCommit ? undefined : footer;
  const resolvedOnSubmit = isImmediateCommit ? undefined : onSubmit;
  const commitContext = useMemo(
    () => ({
      categoryId: selectedCategoryId,
      commitMode,
      onPreferenceChange,
      scopeId: selectedScopeId,
    }),
    [commitMode, onPreferenceChange, selectedCategoryId, selectedScopeId],
  );

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
      chrome={chrome}
      className={cx('workbench-settings-modal', className)}
      bodyClassName={cx('workbench-settings-modal__body', bodyClassName)}
      closeLabel={closeLabel}
      footer={resolvedFooter}
      labelledBy={titleId}
      minHeight={minHeight}
      minWidth={minWidth}
      title={title}
      titleSuffix={titleSuffix}
      onClose={onClose}
      onSubmit={resolvedOnSubmit}
    >
      <WorkbenchSettingsCommitProvider value={commitContext}>
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
                <Button
                  key={scope.id}
                  className={cx(
                    'workbench-settings-tab',
                    isActive && 'workbench-settings-tab--active',
                  )}
                  disabled={scope.disabled}
                  title={scope.title}
                  onClick={() => handleSelectScope(scope.id)}
                >
                  {scope.label}
                </Button>
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
          contentScrollGutter="auto"
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
          navScrollGutter="auto"
        />
      </WorkbenchSettingsCommitProvider>
    </Modal>
  );
}
