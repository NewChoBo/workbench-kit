import './searchable-multi-select.css';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../../utils/cx';
import { cxCodicon } from '../../utils/codicon';
import { Chip } from '../chip';
import { TextInput } from '../text-input/TextInput';
import {
  isTriggerVisible,
  measureOverlayPosition,
  overlayListboxStyle,
  resolvePortalContainer,
  type OverlayPosition,
} from './overlay';

export interface SearchableMultiSelectOption {
  readonly count?: number;
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

export interface SearchableMultiSelectProps {
  readonly 'aria-label'?: string | undefined;
  readonly className?: string;
  readonly disabled?: boolean;
  /** Shown when the query matches no options. Default: "No matching options". */
  readonly emptyMessage?: string;
  /** Aria label for dismissible selected chips. Default: "Remove {label}". */
  readonly getRemoveChipAriaLabel?: (optionLabel: string) => string;
  readonly onValueToggle: (value: string) => void;
  readonly options: ReadonlyArray<SearchableMultiSelectOption>;
  /** Search input placeholder. Default: "Search". */
  readonly searchPlaceholder?: string;
  readonly selectedValues: readonly string[];
}

/**
 * Searchable multi-select control: selected values as dismissible chips,
 * a filterable combobox input, and a portaled option listbox.
 */
export function SearchableMultiSelect({
  'aria-label': ariaLabel,
  className,
  disabled = false,
  emptyMessage = 'No matching options',
  getRemoveChipAriaLabel,
  onValueToggle,
  options,
  searchPlaceholder = 'Search',
  selectedValues,
}: SearchableMultiSelectProps): ReactNode {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(null);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const optionByValue = useMemo(() => {
    const map = new Map<string, SearchableMultiSelectOption>();
    for (const option of options) {
      map.set(option.value, option);
    }
    return map;
  }, [options]);

  const selectedOptions = useMemo(() => {
    const fromOptions = options.filter((option) => selectedSet.has(option.value));
    const known = new Set(fromOptions.map((option) => option.value));
    const orphans = selectedValues
      .filter((value) => !known.has(value))
      .map((value) => ({ label: value, value }));
    return [...fromOptions, ...orphans];
  }, [options, selectedSet, selectedValues]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, options]);

  const closeListbox = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
    setOverlayPosition(null);
  }, []);

  const updateOverlayPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    if (!isTriggerVisible(trigger)) {
      closeListbox();
      return;
    }

    const optionCount = Math.max(visibleOptions.length, 1);
    const position = measureOverlayPosition(trigger, optionCount);
    if (!position) {
      closeListbox();
      return;
    }

    setOverlayPosition(position);
  }, [closeListbox, visibleOptions.length]);

  useLayoutEffect(() => {
    if (!open) {
      setOverlayPosition(null);
      return;
    }

    updateOverlayPosition();
    window.addEventListener('resize', updateOverlayPosition);
    window.addEventListener('scroll', updateOverlayPosition, true);
    return () => {
      window.removeEventListener('resize', updateOverlayPosition);
      window.removeEventListener('scroll', updateOverlayPosition, true);
    };
  }, [open, updateOverlayPosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }
      if (listboxRef.current?.contains(target)) {
        return;
      }
      closeListbox();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [closeListbox, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (visibleOptions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((current) => {
      if (current >= 0 && current < visibleOptions.length) {
        return current;
      }
      const firstEnabled = visibleOptions.findIndex((option) => !option.disabled);
      return firstEnabled;
    });
  }, [open, visibleOptions]);

  const toggleValue = (value: string) => {
    if (disabled) {
      return;
    }
    onValueToggle(value);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((current) => moveHighlight(visibleOptions, current, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((current) => moveHighlight(visibleOptions, current, -1));
      return;
    }

    if (event.key === 'Enter') {
      const highlighted = highlightedIndex >= 0 ? visibleOptions[highlightedIndex] : undefined;
      if (open && highlighted && !highlighted.disabled) {
        event.preventDefault();
        toggleValue(highlighted.value);
        setQuery('');
        return;
      }
    }

    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        closeListbox();
      }
      return;
    }

    if (event.key === 'Backspace' && query.length === 0 && selectedValues.length > 0) {
      event.preventDefault();
      const last = selectedValues[selectedValues.length - 1];
      if (last !== undefined) {
        toggleValue(last);
      }
    }
  };

  const listbox =
    open && overlayPosition ? (
      <ul
        ref={listboxRef}
        className={cx('ui-searchable-multi-select__list', 'ui-workbench-scrollbar')}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        aria-multiselectable="true"
        data-ui-searchable-multi-select-listbox="true"
        style={overlayListboxStyle(overlayPosition)}
      >
        {visibleOptions.length === 0 ? (
          <li className="ui-searchable-multi-select__empty" role="presentation">
            {emptyMessage}
          </li>
        ) : (
          visibleOptions.map((option, index) => {
            const selected = selectedSet.has(option.value);
            return (
              <li key={option.value} role="presentation">
                <button
                  aria-selected={selected}
                  className="ui-searchable-multi-select__option"
                  data-highlighted={highlightedIndex === index ? 'true' : undefined}
                  data-selected={selected ? 'true' : undefined}
                  data-ui-searchable-multi-select-option={option.value}
                  disabled={disabled || option.disabled}
                  role="option"
                  type="button"
                  onMouseDown={(event) => {
                    // Keep input focus; prevent blur-before-click race.
                    event.preventDefault();
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                  }}
                  onClick={() => {
                    toggleValue(option.value);
                    setQuery('');
                  }}
                >
                  <span className="ui-searchable-multi-select__option-label">{option.label}</span>
                  {option.count !== undefined ? (
                    <span className="ui-searchable-multi-select__option-count">{option.count}</span>
                  ) : null}
                  {selected ? (
                    <i
                      aria-hidden="true"
                      className={cxCodicon('check', 'ui-searchable-multi-select__option-check')}
                    />
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    ) : null;

  return (
    <div
      ref={rootRef}
      className={cx('ui-searchable-multi-select', className)}
      data-ui-searchable-multi-select="true"
      data-open={open ? 'true' : undefined}
    >
      {selectedOptions.length > 0 ? (
        <div className="ui-searchable-multi-select__chips" role="list">
          {selectedOptions.map((option) => {
            const chipLabel = optionByValue.get(option.value)?.label ?? option.label;
            return (
              <Chip
                key={option.value}
                aria-label={getRemoveChipAriaLabel?.(chipLabel) ?? `Remove ${chipLabel}`}
                className="ui-searchable-multi-select__chip"
                data-ui-searchable-multi-select-chip={option.value}
                disabled={disabled}
                label={chipLabel}
                onDismiss={
                  disabled
                    ? undefined
                    : () => {
                        toggleValue(option.value);
                      }
                }
              />
            );
          })}
        </div>
      ) : null}
      <div className="ui-searchable-multi-select__control">
        <TextInput
          ref={triggerRef}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className="ui-searchable-multi-select__input"
          controlWidth="full"
          disabled={disabled}
          placeholder={searchPlaceholder}
          role="combobox"
          type="search"
          value={query}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onKeyDown={handleInputKeyDown}
          onValueChange={(next) => {
            setQuery(next);
            if (!open) {
              setOpen(true);
            }
          }}
        />
      </div>
      {listbox ? createPortal(listbox, resolvePortalContainer(triggerRef.current)) : null}
    </div>
  );
}

function moveHighlight(
  options: ReadonlyArray<SearchableMultiSelectOption>,
  current: number,
  delta: number,
): number {
  if (options.length === 0) {
    return -1;
  }
  let next = current;
  for (let step = 0; step < options.length; step += 1) {
    next = (next + delta + options.length) % options.length;
    if (!options[next]?.disabled) {
      return next;
    }
  }
  return current;
}
