import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useModalFocusTrap } from '../../modal/useModalFocusTrap';
import { Button } from '../../primitives/button';
import { EmptyState } from '../../primitives/empty-state';
import { IconButton } from '../../primitives/icon-button';
import { TextInput } from '../../primitives/text-input';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import {
  DEFAULT_QUICK_OPEN_SEARCH_DEBOUNCE_MS,
  getNextQuickOpenItemIndex,
  isQuickOpenItemSelectable,
  type QuickOpenItem,
  type QuickOpenProvider,
  type QuickOpenSelectContext,
} from './quick-open-model';

interface WorkbenchQuickOpenKeyEvent {
  key: string;
  preventDefault: () => void;
}

function useControllableQuery({
  defaultQuery = '',
  query,
  onQueryChange,
}: {
  defaultQuery?: string | undefined;
  query?: string | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
}) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState(defaultQuery);
  const resolvedQuery = query ?? uncontrolledQuery;

  const setQuery = (nextQuery: string) => {
    if (query === undefined) {
      setUncontrolledQuery(nextQuery);
    }
    onQueryChange?.(nextQuery);
  };

  return [resolvedQuery, setQuery] as const;
}

export interface WorkbenchQuickOpenProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onSelect' | 'title'
> {
  activeItemId?: string | undefined;
  closeLabel?: string | undefined;
  debounceMs?: number | undefined;
  defaultQuery?: string | undefined;
  emptyLabel?: ReactNode | undefined;
  onActiveItemChange?: ((itemId: string) => void) | undefined;
  onClose: () => void;
  onQueryChange?: ((query: string) => void) | undefined;
  onSelectItem?: ((item: QuickOpenItem, context: QuickOpenSelectContext) => void) | undefined;
  open?: boolean | undefined;
  placeholder?: string | undefined;
  /** When omitted, the first provider is used. */
  providerId?: string | undefined;
  providers: readonly QuickOpenProvider[];
  query?: string | undefined;
  restoreFocusOnClose?: boolean | undefined;
  title?: ReactNode | undefined;
}

export function WorkbenchQuickOpen({
  activeItemId,
  className,
  closeLabel = 'Close Quick Open',
  debounceMs = DEFAULT_QUICK_OPEN_SEARCH_DEBOUNCE_MS,
  defaultQuery,
  emptyLabel = 'No matching files',
  onActiveItemChange,
  onClose,
  onQueryChange,
  onSelectItem,
  open = true,
  placeholder = 'Search files by name',
  providerId,
  providers,
  query,
  restoreFocusOnClose = true,
  title = 'Quick Open',
  ...props
}: WorkbenchQuickOpenProps) {
  const titleId = useId();
  const listId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledActiveItemId, setUncontrolledActiveItemId] = useState<string>();
  const [items, setItems] = useState<QuickOpenItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvedQuery, setResolvedQuery] = useControllableQuery({
    defaultQuery,
    onQueryChange,
    query,
  });

  const activeProvider = useMemo(() => {
    if (providerId) {
      return providers.find((provider) => provider.id === providerId) ?? providers[0];
    }
    return providers[0];
  }, [providerId, providers]);

  const resolvedActiveItemId = activeItemId ?? uncontrolledActiveItemId ?? items[0]?.id;
  const activeIndex = items.findIndex((item) => item.id === resolvedActiveItemId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : items.find(isQuickOpenItemSelectable);

  const updateActiveItem = useCallback(
    (itemId: string | undefined) => {
      if (!itemId) return;
      if (activeItemId === undefined) {
        setUncontrolledActiveItemId(itemId);
      }
      onActiveItemChange?.(itemId);
    },
    [activeItemId, onActiveItemChange],
  );

  useModalFocusTrap({
    enabled: open,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    onClose,
    restoreFocusOnClose,
  });

  useEffect(() => {
    if (!open || !activeProvider) {
      setItems([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const runSearch = async () => {
      setSearching(true);
      try {
        const nextItems = await Promise.resolve(activeProvider.search(resolvedQuery));
        if (!cancelled) {
          setItems(nextItems);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    };

    // Empty query (recent / top-level) should paint immediately; debounce typed queries.
    const delay = resolvedQuery.trim() ? Math.max(0, debounceMs) : 0;
    if (delay === 0) {
      void runSearch();
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      void runSearch();
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeProvider, debounceMs, open, resolvedQuery]);

  useEffect(() => {
    if (!open) return;
    if (activeItemId !== undefined) return;

    setUncontrolledActiveItemId((currentItemId) => {
      const nextItemId = items.find(isQuickOpenItemSelectable)?.id;
      return currentItemId === nextItemId ? currentItemId : nextItemId;
    });
  }, [activeItemId, items, open]);

  const selectItem = useCallback(
    (item: QuickOpenItem, index: number) => {
      if (!isQuickOpenItemSelectable(item) || !activeProvider) return;
      onSelectItem?.(item, {
        index,
        providerId: activeProvider.id,
        query: resolvedQuery,
      });
    },
    [activeProvider, onSelectItem, resolvedQuery],
  );

  const handleQuickOpenKeyDown = useCallback(
    (event: WorkbenchQuickOpenKeyEvent) => {
      if (
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'Home' &&
        event.key !== 'End' &&
        event.key !== 'PageDown' &&
        event.key !== 'PageUp' &&
        event.key !== 'Enter'
      ) {
        return;
      }

      if (event.key === 'Enter') {
        if (!activeItem) return;
        event.preventDefault();
        selectItem(activeItem, Math.max(activeIndex, 0));
        return;
      }

      event.preventDefault();

      const direction =
        event.key === 'ArrowUp' || event.key === 'End' || event.key === 'PageUp'
          ? 'previous'
          : 'next';
      const stepCount = event.key === 'PageDown' || event.key === 'PageUp' ? 5 : 1;
      let nextIndex =
        event.key === 'Home'
          ? getNextQuickOpenItemIndex({
              currentIndex: -1,
              direction: 'next',
              items,
            })
          : event.key === 'End'
            ? getNextQuickOpenItemIndex({
                currentIndex: 0,
                direction: 'previous',
                items,
              })
            : activeIndex;

      if (event.key !== 'Home' && event.key !== 'End') {
        for (let step = 0; step < stepCount; step += 1) {
          const steppedIndex = getNextQuickOpenItemIndex({
            currentIndex: nextIndex,
            direction,
            items,
          });

          if (steppedIndex < 0 || steppedIndex === nextIndex) break;
          nextIndex = steppedIndex;
        }
      }

      if (nextIndex >= 0) {
        updateActiveItem(items[nextIndex]?.id);
      }
    },
    [activeIndex, activeItem, items, selectItem, updateActiveItem],
  );

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      handleQuickOpenKeyDown(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleQuickOpenKeyDown, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handleQuickOpenKeyDown(event);
  };

  useEffect(() => {
    if (!resolvedActiveItemId) return;

    const activeElement = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('[data-quick-open-id]') ?? [],
    ).find((element) => element.dataset.quickOpenId === resolvedActiveItemId);

    activeElement?.scrollIntoView?.({ block: 'nearest' });
  }, [items, resolvedActiveItemId]);

  if (!open) return null;

  return (
    <div className="ui-workbench-command-palette-overlay" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx('ui-workbench-command-palette', className)}
        data-testid="workbench-quick-open"
        role="dialog"
        {...props}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-workbench-command-palette__header">
          <span id={titleId} className="ui-workbench-command-palette__title">
            {title}
          </span>
          <IconButton
            className="ui-workbench-command-palette__close"
            icon="codicon-close"
            label={closeLabel}
            onClick={onClose}
          />
        </div>
        <div className="ui-workbench-command-palette__search">
          <i aria-hidden="true" className="codicon codicon-search" />
          <TextInput
            ref={inputRef}
            aria-activedescendant={
              activeItem ? `${listId}-${activeItem.id.replace(/[^\w-]/g, '_')}` : undefined
            }
            aria-controls={listId}
            aria-label={placeholder}
            className="ui-workbench-command-palette__input"
            controlWidth="full"
            placeholder={placeholder}
            type="search"
            value={resolvedQuery}
            onValueChange={setResolvedQuery}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div
          id={listId}
          aria-busy={searching || undefined}
          aria-label="Quick Open results"
          className={cx('ui-workbench-command-list', 'ui-workbench-scrollbar')}
          role="listbox"
        >
          {items.length === 0 ? (
            <EmptyState compact icon="codicon-search">
              {emptyLabel}
            </EmptyState>
          ) : (
            items.map((item, index) => {
              const active = item.id === resolvedActiveItemId;
              const itemDomId = `${listId}-${item.id.replace(/[^\w-]/g, '_')}`;
              const descriptionId = item.description ? `${itemDomId}-description` : undefined;

              return (
                <Button
                  key={item.id}
                  id={itemDomId}
                  aria-describedby={descriptionId}
                  aria-selected={active}
                  className="ui-workbench-command-item"
                  data-active={active ? 'true' : undefined}
                  data-quick-open-id={item.id}
                  disabled={item.disabled}
                  role="option"
                  onClick={() => selectItem(item, index)}
                  onMouseEnter={() => updateActiveItem(item.id)}
                >
                  <span className="ui-workbench-command-item__icon">
                    {item.icon ? <i aria-hidden="true" className={cxCodicon(item.icon)} /> : null}
                  </span>
                  <span className="ui-workbench-command-item__content">
                    <span className="ui-workbench-command-item__label">{item.label}</span>
                    {item.description ? (
                      <span id={descriptionId} className="ui-workbench-command-item__description">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="ui-workbench-command-item__meta">
                    {item.detail ? (
                      <span className="ui-workbench-command-item__category">{item.detail}</span>
                    ) : activeProvider ? (
                      <span className="ui-workbench-command-item__category">
                        {activeProvider.label}
                      </span>
                    ) : null}
                  </span>
                </Button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export type {
  QuickOpenItem,
  QuickOpenProvider,
  QuickOpenSelectContext,
} from './quick-open-model';
export {
  DEFAULT_QUICK_OPEN_SEARCH_DEBOUNCE_MS,
  getNextQuickOpenItemIndex,
  isQuickOpenItemSelectable,
} from './quick-open-model';
export {
  WORKSPACE_FILES_QUICK_OPEN_PROVIDER_ID,
  createWorkspaceFilesQuickOpenProvider,
  resolveQuickOpenItemPath,
} from './createWorkspaceFilesQuickOpenProvider';
export type { CreateWorkspaceFilesQuickOpenProviderOptions } from './createWorkspaceFilesQuickOpenProvider';
