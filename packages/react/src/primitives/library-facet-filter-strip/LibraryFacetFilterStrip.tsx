import './library-facet-filter-strip.css';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { Button } from '../button/Button';
import { Codicon } from '../codicon/Codicon';
import { IconButton } from '../icon-button/IconButton';
import { isSearchableMultiSelectPortalTarget } from '../searchable-multi-select/overlay';

/** Product-neutral facet field kind for toggle callbacks. */
export type LibraryFacetFieldKind = 'single-select' | 'multi-select';

/**
 * How a field renders in `LibraryFacetFilterPanel`.
 * `checklist` — dense checkbox/radio list.
 * `searchable-multi` — selected chips + searchable suggestion list.
 */
export type LibraryFacetFieldPresentation = 'checklist' | 'searchable-multi';

export interface LibraryFacetFieldOption {
  readonly count?: number;
  readonly label: string;
  readonly value: string;
}

/**
 * Host-mapped facet field descriptor. Filter out sentinel / empty options before
 * passing — this component renders the options array as provided.
 */
export interface LibraryFacetField {
  readonly id: string;
  readonly kind: LibraryFacetFieldKind;
  readonly options: ReadonlyArray<LibraryFacetFieldOption>;
  /**
   * Panel presentation hint. When omitted, long multi-select lists use
   * `searchable-multi` and short lists use `checklist`.
   */
  readonly presentation?: LibraryFacetFieldPresentation;
}

export interface LibraryFacetActiveChip {
  readonly id: string;
  readonly label: string;
}

export interface LibraryFacetFilterStripProps {
  readonly activeChips: ReadonlyArray<LibraryFacetActiveChip>;
  readonly clearAllLabel: string;
  readonly expanded: boolean;
  readonly filtersButtonLabel: string;
  readonly filtersMenuAriaLabel: string;
  /**
   * When set with `onOpenMoreFilters`, replaces cascade show-more/less with a
   * menu item that opens the fuller facet panel/dialog.
   */
  readonly moreFiltersLabel?: string;
  readonly onClearAll: () => void;
  readonly onOpenMoreFilters?: () => void;
  readonly onShowLess: () => void;
  readonly onShowMore: () => void;
  readonly onToggleFacetValue: (
    fieldId: string,
    value: string,
    kind: LibraryFacetFieldKind,
  ) => void;
  readonly primaryFields: ReadonlyArray<LibraryFacetField>;
  readonly resolveFieldLabel: (fieldId: string) => string;
  readonly secondaryFields: ReadonlyArray<LibraryFacetField>;
  readonly selectedValues: Readonly<Record<string, readonly string[]>>;
  readonly showLessLabel: string;
  readonly showMoreLabel: string;
}

/**
 * Compact facet filter control for catalog toolbars (`facetStrip` slot).
 * Cascade field menus + clear / show-more actions. Domain DTOs stay in the host.
 */
export function LibraryFacetFilterStrip({
  activeChips,
  clearAllLabel,
  expanded,
  filtersButtonLabel,
  filtersMenuAriaLabel,
  moreFiltersLabel,
  onClearAll,
  onOpenMoreFilters,
  onShowLess,
  onShowMore,
  onToggleFacetValue,
  primaryFields,
  resolveFieldLabel,
  secondaryFields,
  selectedValues,
  showLessLabel,
  showMoreLabel,
}: LibraryFacetFilterStripProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [openFieldId, setOpenFieldId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const useMoreFiltersDialog = onOpenMoreFilters !== undefined && moreFiltersLabel !== undefined;
  // With a fuller panel dialog, keep the cascade on primary fields only.
  const visibleFields = useMoreFiltersDialog
    ? primaryFields
    : expanded
      ? [...primaryFields, ...secondaryFields]
      : primaryFields;
  const menuFields = visibleFields.filter((field) => field.options.length > 0);
  const hasActiveFilters = activeChips.length > 0;
  const activeFiltersTooltip = useMemo(
    () => (activeChips.length > 0 ? activeChips.map((chip) => chip.label).join('\n') : undefined),
    [activeChips],
  );

  const closeMenu = (): void => {
    setIsOpen(false);
    setOpenFieldId(null);
  };

  const hasAnyFields = primaryFields.length > 0 || secondaryFields.length > 0;
  if (menuFields.length === 0 && !(useMoreFiltersDialog && hasAnyFields)) {
    return null;
  }

  return (
    <>
      <IconButton
        ref={triggerRef}
        data-ui-library-facet-menu-trigger="true"
        data-ui-library-facet-menu-trigger-active={isOpen || hasActiveFilters ? 'true' : undefined}
        data-ui-library-facet-active-count={
          hasActiveFilters ? String(activeChips.length) : undefined
        }
        icon="codicon-filter"
        label={filtersButtonLabel}
        title={activeFiltersTooltip ?? filtersButtonLabel}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      />
      {isOpen ? (
        <FacetFilterCascadeMenu
          activeChips={activeChips}
          anchorRef={triggerRef}
          ariaLabel={filtersMenuAriaLabel}
          clearAllLabel={clearAllLabel}
          expanded={expanded}
          menuFields={menuFields}
          moreFiltersLabel={moreFiltersLabel}
          openFieldId={openFieldId}
          onClearAll={() => {
            onClearAll();
            closeMenu();
          }}
          onClose={closeMenu}
          onOpenFieldIdChange={setOpenFieldId}
          onOpenMoreFilters={
            useMoreFiltersDialog
              ? () => {
                  closeMenu();
                  onOpenMoreFilters();
                }
              : undefined
          }
          onShowLess={onShowLess}
          onShowMore={onShowMore}
          onToggleFacetValue={onToggleFacetValue}
          resolveFieldLabel={resolveFieldLabel}
          secondaryFields={secondaryFields}
          selectedValues={selectedValues}
          showLessLabel={showLessLabel}
          showMoreLabel={showMoreLabel}
          useMoreFiltersDialog={useMoreFiltersDialog}
        />
      ) : null}
    </>
  );
}

function FacetFilterCascadeMenu({
  activeChips,
  anchorRef,
  ariaLabel,
  clearAllLabel,
  expanded,
  menuFields,
  moreFiltersLabel,
  onClearAll,
  onClose,
  onOpenFieldIdChange,
  onOpenMoreFilters,
  onShowLess,
  onShowMore,
  onToggleFacetValue,
  openFieldId,
  resolveFieldLabel,
  secondaryFields,
  selectedValues,
  showLessLabel,
  showMoreLabel,
  useMoreFiltersDialog,
}: {
  activeChips: LibraryFacetFilterStripProps['activeChips'];
  anchorRef: RefObject<HTMLButtonElement | null>;
  ariaLabel: string;
  clearAllLabel: string;
  expanded: boolean;
  menuFields: ReadonlyArray<LibraryFacetField>;
  moreFiltersLabel: string | undefined;
  onClearAll: () => void;
  onClose: () => void;
  onOpenFieldIdChange: (fieldId: string | null) => void;
  onOpenMoreFilters: (() => void) | undefined;
  onShowLess: () => void;
  onShowMore: () => void;
  onToggleFacetValue: LibraryFacetFilterStripProps['onToggleFacetValue'];
  openFieldId: string | null;
  resolveFieldLabel: (fieldId: string) => string;
  secondaryFields: ReadonlyArray<LibraryFacetField>;
  selectedValues: Readonly<Record<string, readonly string[]>>;
  showLessLabel: string;
  showMoreLabel: string;
  useMoreFiltersDialog: boolean;
}): ReactNode {
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const fieldItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const openField = menuFields.find((field) => field.id === openFieldId) ?? null;

  useAnchoredMenuPosition({
    anchorRef,
    computePosition: (anchor) => {
      const rect = anchor.getBoundingClientRect();
      return { left: Math.max(8, rect.left), top: rect.bottom + 4 };
    },
    deps: [anchorRef],
    menuRef: mainMenuRef,
  });

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) {
        return;
      }

      if (mainMenuRef.current?.contains(target)) {
        return;
      }

      if (document.querySelector('[data-ui-library-facet-submenu]')?.contains(target)) {
        return;
      }

      // Portaled SearchableMultiSelect listbox is not under the menu root.
      if (isSearchableMultiSelectPortalTarget(event.target)) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose]);

  const portalTarget =
    anchorRef.current?.closest<HTMLElement>('[data-theme-preset], [data-theme]') ?? document.body;

  return createPortal(
    <>
      <div
        ref={mainMenuRef}
        aria-label={ariaLabel}
        className="ui-context-menu ui-library-facet-filter-strip__menu"
        data-has-icons="true"
        data-has-shortcuts="true"
        data-ui-library-facet-menu="true"
        role="menu"
      >
        {menuFields.map((field) => {
          const fieldSelections = selectedValues[field.id] ?? [];
          const fieldLabel = resolveFieldLabel(field.id);
          const isFieldOpen = openFieldId === field.id;

          return (
            <Button
              key={field.id}
              ref={(node) => {
                if (node === null) {
                  fieldItemRefs.current.delete(field.id);
                  return;
                }

                fieldItemRefs.current.set(field.id, node);
              }}
              aria-expanded={isFieldOpen}
              aria-haspopup="menu"
              className="ui-context-menu__item"
              data-ui-library-facet-field={field.id}
              data-ui-library-facet-field-open={isFieldOpen ? 'true' : undefined}
              role="menuitem"
              type="button"
              onClick={() => {
                onOpenFieldIdChange(isFieldOpen ? null : field.id);
              }}
            >
              <span className="ui-context-menu__icon" aria-hidden="true">
                {fieldSelections.length > 0 ? <Codicon icon="codicon-check" /> : null}
              </span>
              <span className="ui-context-menu__label">{fieldLabel}</span>
              <span className="ui-context-menu__shortcut">
                {fieldSelections.length > 0 ? (
                  String(fieldSelections.length)
                ) : (
                  <Codicon icon="codicon-chevron-right" />
                )}
              </span>
            </Button>
          );
        })}
        {activeChips.length > 0 ? (
          <>
            <div className="ui-context-menu__separator" role="separator" />
            <Button
              className="ui-context-menu__item"
              data-ui-library-facet-clear-all="true"
              role="menuitem"
              type="button"
              onClick={() => {
                onOpenFieldIdChange(null);
                onClearAll();
              }}
            >
              <span className="ui-context-menu__icon" aria-hidden="true" />
              <span className="ui-context-menu__label">{clearAllLabel}</span>
            </Button>
          </>
        ) : null}
        {useMoreFiltersDialog &&
        onOpenMoreFilters !== undefined &&
        moreFiltersLabel !== undefined ? (
          <>
            <div className="ui-context-menu__separator" role="separator" />
            <Button
              className="ui-context-menu__item"
              data-ui-library-facet-more-filters="true"
              role="menuitem"
              type="button"
              onClick={() => {
                onOpenFieldIdChange(null);
                onOpenMoreFilters();
              }}
            >
              <span className="ui-context-menu__icon" aria-hidden="true" />
              <span className="ui-context-menu__label">{moreFiltersLabel}</span>
            </Button>
          </>
        ) : secondaryFields.length > 0 ? (
          <>
            <div className="ui-context-menu__separator" role="separator" />
            <Button
              className="ui-context-menu__item"
              data-ui-library-facet-toggle="true"
              role="menuitem"
              type="button"
              onClick={() => {
                onOpenFieldIdChange(null);
                if (expanded) {
                  onShowLess();
                  return;
                }

                onShowMore();
              }}
            >
              <span className="ui-context-menu__icon" aria-hidden="true" />
              <span className="ui-context-menu__label">
                {expanded ? showLessLabel : showMoreLabel}
              </span>
            </Button>
          </>
        ) : null}
      </div>
      {openField ? (
        <FacetFilterSubmenu
          anchorItemRef={{ current: fieldItemRefs.current.get(openField.id) ?? null }}
          field={openField}
          onToggleFacetValue={onToggleFacetValue}
          resolveFieldLabel={resolveFieldLabel}
          selectedValues={selectedValues[openField.id] ?? []}
        />
      ) : null}
    </>,
    portalTarget,
  );
}

function FacetFilterSubmenu({
  anchorItemRef,
  field,
  onToggleFacetValue,
  resolveFieldLabel,
  selectedValues,
}: {
  anchorItemRef: RefObject<HTMLButtonElement | null>;
  field: LibraryFacetField;
  onToggleFacetValue: LibraryFacetFilterStripProps['onToggleFacetValue'];
  resolveFieldLabel: (fieldId: string) => string;
  selectedValues: readonly string[];
}): ReactNode {
  const submenuRef = useRef<HTMLDivElement>(null);
  const options = field.options;

  useAnchoredMenuPosition({
    anchorRef: anchorItemRef,
    computePosition: (anchorItem, submenu) => {
      const itemRect = anchorItem.getBoundingClientRect();
      const submenuRect = submenu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = itemRect.right + 4;
      let top = itemRect.top;

      if (left + submenuRect.width > viewportWidth - 8) {
        left = Math.max(8, itemRect.left - submenuRect.width - 4);
      }

      const maxTop = viewportHeight - submenuRect.height - 8;
      if (top > maxTop) {
        top = Math.max(8, maxTop);
      }

      return { left, top };
    },
    deps: [anchorItemRef, field.id, options.length],
    menuRef: submenuRef,
  });

  return (
    <div
      ref={submenuRef}
      aria-label={resolveFieldLabel(field.id)}
      className="ui-context-menu ui-library-facet-filter-strip__submenu"
      data-has-icons="true"
      data-has-shortcuts="true"
      data-ui-library-facet-submenu={field.id}
      role="menu"
    >
      {options.map((option) => {
        const selected = selectedValues.includes(option.value);

        return (
          <Button
            key={`${field.id}:${option.value}`}
            aria-pressed={selected}
            className="ui-context-menu__item"
            data-ui-library-facet-option={`${field.id}:${option.value}`}
            role="menuitemcheckbox"
            type="button"
            onClick={() => {
              onToggleFacetValue(field.id, option.value, field.kind);
            }}
          >
            <span className="ui-context-menu__icon" aria-hidden="true">
              {selected ? <Codicon icon="codicon-check" /> : null}
            </span>
            <span className="ui-context-menu__label">{option.label}</span>
            {option.count !== undefined ? (
              <span className="ui-context-menu__shortcut">{option.count}</span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}

function useAnchoredMenuPosition({
  anchorRef,
  computePosition,
  deps,
  menuRef,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  computePosition: (anchor: HTMLElement, menu: HTMLElement) => { left: number; top: number };
  deps: readonly unknown[];
  menuRef: RefObject<HTMLElement | null>;
}): void {
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (anchor === null || menu === null) {
      return;
    }

    const updatePosition = (): void => {
      const { left, top } = computePosition(anchor, menu);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, deps);
}
