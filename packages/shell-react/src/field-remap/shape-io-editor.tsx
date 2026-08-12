import { useMemo, useState, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import {
  FIELD_DATA_TYPES,
  flattenSourceFields,
  flattenTargetSlots,
  isFieldDataType,
  setSourceFieldDataType,
  setTargetSlotDataType,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type FieldDataType,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';

export type FieldRemapShapeRole = 'source' | 'target';

export interface FieldRemapShapeIoEditorProps {
  readonly role: FieldRemapShapeRole;
  readonly title: string;
  readonly idPrefix: string;
  /** Current plain sample used for ingest / preview input. */
  readonly sampleJson: string;
  readonly fields: readonly SourceField[] | readonly TargetSlot[];
  readonly onSampleJsonChange: (next: string) => void;
  readonly onApplySample: (parsed: unknown) => void;
  readonly onFieldsChange: (next: readonly SourceField[] | readonly TargetSlot[]) => void;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Host-owned shape IO surface: paste JSON → ingest fields/slots, edit FieldDataType.
 * Persistence stays host-owned (`FieldRemapDocument` stores mappings, not shapes).
 */
export function FieldRemapShapeIoEditor({
  role,
  title,
  idPrefix,
  sampleJson,
  fields,
  onSampleJsonChange,
  onApplySample,
  onFieldsChange,
}: FieldRemapShapeIoEditorProps): JSX.Element {
  const [parseError, setParseError] = useState<string | undefined>();
  const flat = useMemo(
    () =>
      role === 'source'
        ? flattenSourceFields(fields as readonly SourceField[])
        : flattenTargetSlots(fields as readonly TargetSlot[]),
    [fields, role],
  );

  const applyJson = () => {
    try {
      const parsed: unknown = JSON.parse(sampleJson);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setParseError('Shape sample must be a JSON object.');
        return;
      }
      setParseError(undefined);
      onApplySample(parsed);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error));
    }
  };

  const onTypeChange = (id: string, dataType: FieldDataType) => {
    if (role === 'source') {
      onFieldsChange(setSourceFieldDataType(fields as readonly SourceField[], id, dataType));
      return;
    }
    onFieldsChange(setTargetSlotDataType(fields as readonly TargetSlot[], id, dataType));
  };

  return (
    <section
      className="workbench-field-remap-shape-io"
      data-testid={`field-remap-shape-io-${role}`}
      aria-labelledby={`field-remap-shape-io-${role}-title`}
    >
      <header className="workbench-field-remap-shape-io__header">
        <h3 id={`field-remap-shape-io-${role}-title`}>{title}</h3>
        <p className="workbench-field-remap-shape-io__hint">
          Paste JSON to ingest {role === 'source' ? 'source fields' : 'target slots'} (prefix{' '}
          <code>{idPrefix}</code>). Types stay editable; hosts own shape persistence.
        </p>
      </header>

      <label className="workbench-field-remap-shape-io__json-label">
        <span>{role === 'source' ? 'Source JSON' : 'Target shape JSON'}</span>
        <textarea
          className="workbench-field-remap-shape-io__json"
          aria-label={`${title} JSON`}
          rows={8}
          value={sampleJson}
          onChange={(event) => onSampleJsonChange(event.target.value)}
          spellCheck={false}
        />
      </label>

      <div className="workbench-field-remap-shape-io__actions">
        <Button type="button" onClick={applyJson}>
          Apply JSON
        </Button>
      </div>

      {parseError ? (
        <p className="workbench-field-remap-shape-io__error" role="alert">
          {parseError}
        </p>
      ) : null}

      <ul className="workbench-field-remap-shape-io__fields" aria-label={`${title} fields`}>
        {flat.map((field) => (
          <li key={field.id} className="workbench-field-remap-shape-io__field">
            <div className="workbench-field-remap-shape-io__field-meta">
              <code>{field.id}</code>
              <span>{field.path ?? field.label}</span>
            </div>
            <label className="workbench-field-remap-shape-io__type">
              <span className="workbench-field-remap-shape-io__type-label">Type</span>
              <select
                aria-label={`Type for ${field.id}`}
                value={field.dataType ?? 'unknown'}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isFieldDataType(next)) {
                    onTypeChange(field.id, next);
                  }
                }}
              >
                {FIELD_DATA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ingest helpers shared by the panel when Apply JSON runs. */
export function ingestSourceShape(
  sample: unknown,
  idPrefix: string,
): { fields: SourceField[]; sampleJson: string } {
  return {
    fields: sourceFieldsFromPlainObject(sample, { idPrefix }),
    sampleJson: formatJson(sample),
  };
}

export function ingestTargetShape(
  sample: unknown,
  idPrefix: string,
): { fields: TargetSlot[]; sampleJson: string } {
  return {
    fields: targetSlotsFromPlainObject(sample, { idPrefix }),
    sampleJson: formatJson(sample),
  };
}
