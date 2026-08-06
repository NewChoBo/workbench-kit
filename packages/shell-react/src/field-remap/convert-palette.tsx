import type { JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
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
        <Button
          type="button"
          data-testid="field-remap-place-draft"
          disabled={!selectedTransformId}
          onClick={() => {
            if (!selectedTransformId) {
              return;
            }
            onPlaceDraft(selectedTransformId);
          }}
        >
          {chromeLabels.placeConvert}
        </Button>
      </div>

      <ul
        className="workbench-field-remap-convert-palette__list"
        role="listbox"
        aria-label={chromeLabels.convertsListAriaLabel}
      >
        {catalog.map((definition) => {
          const selected = definition.id === selectedTransformId;
          return (
            <li key={definition.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={
                  selected
                    ? 'workbench-field-remap-convert-palette__item is-selected'
                    : 'workbench-field-remap-convert-palette__item'
                }
                data-testid={`field-remap-palette-item-${definition.id}`}
                onClick={() => onSelectedTransformIdChange(definition.id)}
                onDoubleClick={() => onPlaceDraft(definition.id)}
              >
                <strong>{definition.label}</strong>
                <code>{definition.id}</code>
              </button>
            </li>
          );
        })}
      </ul>

      {onAddCombine || onAddSplit ? (
        <div
          className="workbench-field-remap-convert-palette__operators"
          data-testid="field-remap-operator-palette"
        >
          <h4>{chromeLabels.operatorsTitle}</h4>
          <p>{chromeLabels.operatorsDescription}</p>
          <div className="workbench-field-remap-convert-palette__operator-actions">
            {onAddCombine ? (
              <Button
                compact
                type="button"
                data-testid="field-remap-add-combine"
                onClick={onAddCombine}
              >
                Add combine
              </Button>
            ) : null}
            {onAddSplit ? (
              <Button
                compact
                type="button"
                data-testid="field-remap-add-split"
                onClick={onAddSplit}
              >
                Add split
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
