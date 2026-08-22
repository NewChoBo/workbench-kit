import { useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { SideBarList, SideBarListItem } from '@workbench-kit/react/layout';
import { ClearableTextInput, IconButton } from '@workbench-kit/react/primitives';
import type { ValueTransformRegistry } from '@workbench-kit/field-remap';

import { defaultFieldRemapChromeLabels, type FieldRemapChromeLabels } from './chrome-labels.js';

export interface FieldRemapConvertPaletteProps {
  readonly transforms: ValueTransformRegistry;
  readonly selectedTransformId: string;
  readonly onSelectedTransformIdChange: (transformId: string) => void;
  readonly onPlaceDraft: (transformId: string) => void;
  readonly onAddCombine?: (() => void) | undefined;
  readonly onAddSplit?: (() => void) | undefined;
  /** Resolved chrome labels (defaults when omitted). */
  readonly chromeLabels?: FieldRemapChromeLabels | undefined;
}

/**
 * Primary convert chrome for Field Remap Flow: place-then-wire drafts first,
 * with optional combine/split authoring entry points.
 */
export function FieldRemapConvertPalette({
  transforms,
  selectedTransformId,
  onSelectedTransformIdChange,
  onPlaceDraft,
  onAddCombine,
  onAddSplit,
  chromeLabels = defaultFieldRemapChromeLabels,
}: FieldRemapConvertPaletteProps): JSX.Element {
  // The registry supports replacing definitions through `register`; resolve
  // display metadata on each host render even when the registry object is stable.
  const catalog = transforms.list().filter((definition) => definition.id !== 'identity');
  const [filterQuery, setFilterQuery] = useState('');
  const [requestedRovingTransformId, setRequestedRovingTransformId] = useState(() =>
    catalog.some((definition) => definition.id === selectedTransformId)
      ? selectedTransformId
      : (catalog[0]?.id ?? ''),
  );
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const normalizedFilterQuery = filterQuery.trim().toLowerCase();
  const visibleCatalog = catalog.filter((definition) => {
    if (!normalizedFilterQuery) {
      return true;
    }
    return (
      definition.id.toLowerCase().includes(normalizedFilterQuery) ||
      definition.label.toLowerCase().includes(normalizedFilterQuery)
    );
  });
  const visibleTransformIds = visibleCatalog.map((definition) => definition.id);
  const selectedTransformIsVisible = visibleTransformIds.includes(selectedTransformId);
  const rovingTransformId = visibleTransformIds.includes(requestedRovingTransformId)
    ? requestedRovingTransformId
    : selectedTransformIsVisible
      ? selectedTransformId
      : (visibleTransformIds[0] ?? '');
  const filterLabel =
    chromeLabels.convertFilterLabel ?? defaultFieldRemapChromeLabels.convertFilterLabel;
  const filterPlaceholder =
    chromeLabels.convertFilterPlaceholder ?? defaultFieldRemapChromeLabels.convertFilterPlaceholder;
  const clearFilterLabel =
    chromeLabels.clearConvertFilter ?? defaultFieldRemapChromeLabels.clearConvertFilter;
  const noMatchingConverts =
    chromeLabels.noMatchingConverts ?? defaultFieldRemapChromeLabels.noMatchingConverts;

  const updateFilterQuery = (nextQuery: string) => {
    const normalizedNextQuery = nextQuery.trim().toLowerCase();
    const nextVisibleIds = catalog
      .filter(
        (definition) =>
          !normalizedNextQuery ||
          definition.id.toLowerCase().includes(normalizedNextQuery) ||
          definition.label.toLowerCase().includes(normalizedNextQuery),
      )
      .map((definition) => definition.id);
    setFilterQuery(nextQuery);
    setRequestedRovingTransformId(
      nextVisibleIds.includes(selectedTransformId)
        ? selectedTransformId
        : (nextVisibleIds[0] ?? ''),
    );
  };

  const focusVisibleTransform = (transformId: string) => {
    setRequestedRovingTransformId(transformId);
    optionRefs.current.get(transformId)?.focus();
  };

  const handleFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const targetId = selectedTransformIsVisible
      ? selectedTransformId
      : event.key === 'ArrowDown'
        ? visibleTransformIds[0]
        : visibleTransformIds[visibleTransformIds.length - 1];
    if (!targetId) {
      return;
    }
    event.preventDefault();
    focusVisibleTransform(targetId);
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, transformId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (transformId !== selectedTransformId) {
        onSelectedTransformIdChange(transformId);
      }
      onPlaceDraft(transformId);
      return;
    }

    const currentIndex = visibleTransformIds.indexOf(transformId);
    if (currentIndex < 0) {
      return;
    }
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 1, visibleTransformIds.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = visibleTransformIds.length - 1;
        break;
      default:
        return;
    }

    const nextTransformId = visibleTransformIds[nextIndex];
    if (!nextTransformId) {
      return;
    }
    event.preventDefault();
    focusVisibleTransform(nextTransformId);
    if (nextTransformId !== selectedTransformId) {
      onSelectedTransformIdChange(nextTransformId);
    }
  };

  return (
    <aside
      className="workbench-field-remap-convert-palette"
      data-testid="field-remap-convert-palette"
      aria-label={chromeLabels.convertPaletteAriaLabel}
    >
      <header className="workbench-field-remap-convert-palette__header">
        <h3>{chromeLabels.convertPaletteTitle}</h3>
        <p>{chromeLabels.convertPaletteDescription}</p>
      </header>

      <div className="workbench-field-remap-convert-palette__place">
        <IconButton
          compact
          type="button"
          data-testid="field-remap-place-draft"
          disabled={!selectedTransformId || !selectedTransformIsVisible}
          icon="codicon-add"
          label={chromeLabels.placeConvert}
          onClick={() => {
            if (!selectedTransformId || !selectedTransformIsVisible) {
              return;
            }
            onPlaceDraft(selectedTransformId);
          }}
        />
      </div>

      <ClearableTextInput
        aria-label={filterLabel}
        className="workbench-field-remap-convert-palette__filter"
        clearLabel={clearFilterLabel}
        controlWidth="full"
        placeholder={filterPlaceholder}
        type="search"
        value={filterQuery}
        onClear={() => updateFilterQuery('')}
        onKeyDown={handleFilterKeyDown}
        onValueChange={updateFilterQuery}
      />

      <SideBarList
        className="workbench-field-remap-convert-palette__list"
        role="listbox"
        aria-label={chromeLabels.convertsListAriaLabel}
      >
        {visibleCatalog.map((definition) => {
          const selected = definition.id === selectedTransformId;
          return (
            <SideBarListItem
              ref={(element) => {
                if (element) {
                  optionRefs.current.set(definition.id, element);
                } else {
                  optionRefs.current.delete(definition.id);
                }
              }}
              key={definition.id}
              aria-selected={selected}
              data-testid={`field-remap-palette-item-${definition.id}`}
              role="option"
              selected={selected}
              tabIndex={definition.id === rovingTransformId ? 0 : -1}
              variant="stacked"
              wrapperProps={{ role: 'presentation' }}
              onClick={() => {
                setRequestedRovingTransformId(definition.id);
                onSelectedTransformIdChange(definition.id);
              }}
              onDoubleClick={() => onPlaceDraft(definition.id)}
              onFocus={() => setRequestedRovingTransformId(definition.id)}
              onKeyDown={(event) => handleOptionKeyDown(event, definition.id)}
            >
              <strong>{definition.label}</strong>
              <code title={definition.id}>{definition.id}</code>
            </SideBarListItem>
          );
        })}
      </SideBarList>
      {visibleCatalog.length === 0 ? (
        <p className="workbench-field-remap-convert-palette__empty" role="status">
          {noMatchingConverts}
        </p>
      ) : null}

      {onAddCombine || onAddSplit ? (
        <div
          className="workbench-field-remap-convert-palette__operators"
          data-testid="field-remap-operator-palette"
        >
          <h4>{chromeLabels.operatorsTitle}</h4>
          <p>{chromeLabels.operatorsDescription}</p>
          <div className="workbench-field-remap-convert-palette__operator-actions">
            {onAddCombine ? (
              <IconButton
                compact
                type="button"
                data-testid="field-remap-add-combine"
                icon="codicon-git-merge"
                label={chromeLabels.addCombine}
                onClick={onAddCombine}
              />
            ) : null}
            {onAddSplit ? (
              <IconButton
                compact
                type="button"
                data-testid="field-remap-add-split"
                icon="codicon-split-horizontal"
                label={chromeLabels.addSplit}
                onClick={onAddSplit}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
