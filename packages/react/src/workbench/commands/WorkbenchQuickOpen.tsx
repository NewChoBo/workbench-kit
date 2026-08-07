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

interface QuickOpenResult {
  item: QuickOpenItem;
  key: string;
  provider: QuickOpenProvider;
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
  onProviderError?: ((error: unknown, provider: QuickOpenProvider) => void) | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
  onSelectItem?: ((item: QuickOpenItem, context: QuickOpenSelectContext) => void) | undefined;
  open?: boolean | undefined;
  placeholder?: string | undefined;
  /** Restrict search to one provider. When omitted, all providers contribute. */
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
  onProviderError,
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
  const [uncontrolledActiveResultKey, setUncontrolledActiveResultKey] = useState<string>();
  const [results, setResults] = useState<QuickOpenResult[]>([]);
  const [searching, setSearching] = useState(false);
  const onProviderErrorRef = useRef(onProviderError);
  const [resolvedQuery, setResolvedQuery] = useControllableQuery({
    defaultQuery,
    onQueryChange,
    query,
  });

  useEffect(() => {
    onProviderErrorRef.current = onProviderError;
  }, [onProviderError]);

  const activeProviders = useMemo(() => {
    if (providerId) {
      const provider = providers.find((candidate) => candidate.id === providerId);
      return provider ? [provider] : [];
    }
    return providers;
  }, [providerId, providers]);

  const items = useMemo(() => results.map(({ item }) => item), [results]);
  const controlledActiveResult = activeItemId
    ? results.find(({ item }) => item.id === activeItemId && isQuickOpenItemSelectable(item))
    : undefined;
  const uncontrolledActiveResult = results.find(
    ({ item, key }) => key === uncontrolledActiveResultKey && isQuickOpenItemSelectable(item),
  );
  const activeResult =
    controlledActiveResult ??
    uncontrolledActiveResult ??
    results.find(({ item }) => isQuickOpenItemSelectable(item));
  const resolvedActiveResultKey = activeResult?.key;
  const activeIndex = activeResult ? results.indexOf(activeResult) : -1;

  const updateActiveItem = useCallback(
    (result: QuickOpenResult | undefined) => {
      if (!result) return;
      if (activeItemId === undefined) {
        setUncontrolledActiveResultKey(result.key);
      }
      onActiveItemChange?.(result.item.id);
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
    if (!open || activeProviders.length === 0) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    const runSearch = async () => {
      setResults([]);
      setSearching(true);
      const providerResults = activeProviders.map<QuickOpenResult[] | undefined>(() => undefined);
      const publishAvailableResults = () => {
        setResults(providerResults.flatMap((providerItems) => providerItems ?? []));
      };
      const searches = activeProviders.map(async (provider, providerIndex) => {
        try {
          const providerItems = await Promise.resolve(
            provider.search(resolvedQuery, { signal: controller.signal }),
          );
          if (cancelled) return;

          providerResults[providerIndex] = providerItems.map((item, itemIndex) => ({
            item,
            key: `${providerIndex}:${itemIndex}:${provider.id}:${item.id}`,
            provider,
          }));
          publishAvailableResults();
        } catch (error) {
          if (cancelled) return;
          providerResults[providerIndex] = [];
          publishAvailableResults();
          onProviderErrorRef.current?.(error, provider);
        }
      });

      await Promise.allSettled(searches);
      if (!cancelled) setSearching(false);
    };

    // Empty query (recent / top-level) should paint immediately; debounce typed queries.
    const delay = resolvedQuery.trim() ? Math.max(0, debounceMs) : 0;
    if (delay === 0) {
      void runSearch();
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    const timer = window.setTimeout(() => {
      void runSearch();
    }, delay);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeProviders, debounceMs, open, resolvedQuery]);

  useEffect(() => {
    if (!open) return;
    if (activeItemId !== undefined) return;

    setUncontrolledActiveResultKey((currentResultKey) => {
      const currentResult = results.find(({ key }) => key === currentResultKey);
      if (currentResult && isQuickOpenItemSelectable(currentResult.item)) {
        return currentResultKey;
      }

      return results.find(({ item }) => isQuickOpenItemSelectable(item))?.key;
    });
  }, [activeItemId, open, results]);

  const selectItem = useCallback(
    (result: QuickOpenResult, index: number) => {
      if (!isQuickOpenItemSelectable(result.item)) return;
      onSelectItem?.(result.item, {
        index,
        providerId: result.provider.id,
        query: resolvedQuery,
      });
    },
    [onSelectItem, resolvedQuery],
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
        if (!activeResult) return;
        event.preventDefault();
        selectItem(activeResult, Math.max(activeIndex, 0));
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
        updateActiveItem(results[nextIndex]);
      }
    },
    [activeIndex, activeResult, items, results, selectItem, updateActiveItem],
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
    if (!resolvedActiveResultKey) return;

    const activeElement = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('[data-quick-open-id]') ?? [],
    ).find((element) => element.dataset.quickOpenId === resolvedActiveResultKey);

    activeElement?.scrollIntoView?.({ block: 'nearest' });
  }, [resolvedActiveResultKey, results]);

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
              activeResult ? `${listId}-${activeResult.key.replace(/[^\w-]/g, '_')}` : undefined
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
          {results.length === 0 ? (
            <EmptyState compact icon="codicon-search">
              {emptyLabel}
            </EmptyState>
          ) : (
            results.map((result, index) => {
              const { item, key, provider } = result;
              const active = key === resolvedActiveResultKey;
              const itemDomId = `${listId}-${key.replace(/[^\w-]/g, '_')}`;
              const descriptionId = item.description ? `${itemDomId}-description` : undefined;

              return (
                <Button
                  key={key}
                  id={itemDomId}
                  aria-describedby={descriptionId}
                  aria-selected={active}
                  className="ui-workbench-command-item"
                  data-active={active ? 'true' : undefined}
                  data-quick-open-id={key}
                  disabled={item.disabled}
                  role="option"
                  onClick={() => selectItem(result, index)}
                  onMouseEnter={() => updateActiveItem(result)}
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
                    ) : null}
                    <span className="ui-workbench-command-item__category">{provider.label}</span>
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
  QuickOpenSearchContext,
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
