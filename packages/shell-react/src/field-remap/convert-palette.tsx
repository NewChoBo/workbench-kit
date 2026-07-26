import { useMemo, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import type { ValueTransformRegistry } from '@workbench-kit/field-remap';

export interface FieldRemapConvertPaletteProps {
  readonly transforms: ValueTransformRegistry;
  readonly selectedTransformId: string;
  readonly onSelectedTransformIdChange: (transformId: string) => void;
  readonly onPlaceDraft: (transformId: string) => void;
  readonly onAddCombine?: (() => void) | undefined;
  readonly onAddSplit?: (() => void) | undefined;
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
}: FieldRemapConvertPaletteProps): JSX.Element {
  const catalog = useMemo(
    () => transforms.list().filter((definition) => definition.id !== 'identity'),
    [transforms],
  );

  return (
    <aside
      className="workbench-field-remap-convert-palette"
      data-testid="field-remap-convert-palette"
      aria-label="Convert palette"
    >
      <header className="workbench-field-remap-convert-palette__header">
        <h3>Convert palette</h3>
        <p>
          Place a convert first, then wire source → draft → target. Drafts stay off the document
          until both ports bind.
        </p>
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
          Place convert
        </Button>
      </div>

      <ul
        className="workbench-field-remap-convert-palette__list"
        role="listbox"
        aria-label="Converts"
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
          <h4>n→m operators</h4>
          <p>Create combine (n→1) or split (1→n), then wire ports or edit in the side rail.</p>
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
