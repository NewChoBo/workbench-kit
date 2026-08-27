import { useEffect, useId, useState, type JSX } from 'react';
import {
  Button,
  Checkbox,
  NumberInput,
  TextInput,
  WorkbenchPropertyRow,
  WorkbenchPropertyStack,
} from '@workbench-kit/react/primitives';
import type { TransformOptionField } from '@workbench-kit/field-remap';

export interface TransformOptionsEditorProps {
  readonly fields: readonly TransformOptionField[];
  readonly value: Readonly<Record<string, unknown>>;
  readonly onChange: (next: Record<string, unknown>) => void;
  readonly disabled?: boolean | undefined;
  /** Prefix for stable test ids (`field-remap-option-<key>`). */
  readonly testIdPrefix?: string | undefined;
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const next: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') {
      next[key] = entry;
    } else if (entry !== undefined && entry !== null) {
      next[key] = String(entry);
    }
  }
  return next;
}

function StringMapEditor({
  field,
  value,
  disabled,
  onChange,
  testId,
}: {
  readonly field: TransformOptionField;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (next: Record<string, string>) => void;
  readonly testId: string;
}): JSX.Element {
  const map = asStringMap(value);
  const rows = Object.entries(map);
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');

  const commitRow = (key: string, entryValue: string, previousKey?: string) => {
    const trimmedKey = key.trim();
    const next = { ...map };
    if (previousKey && previousKey !== trimmedKey) {
      delete next[previousKey];
    }
    if (!trimmedKey) {
      onChange(next);
      return;
    }
    next[trimmedKey] = entryValue;
    onChange(next);
  };

  return (
    <div className="workbench-field-remap-options__string-map" data-testid={testId}>
      <ul className="workbench-field-remap-options__string-map-rows">
        {rows.map(([key, entryValue]) => (
          <li key={key}>
            <input
              type="text"
              aria-label={`${field.label} key`}
              disabled={disabled}
              value={key}
              onChange={(event) => commitRow(event.target.value, entryValue, key)}
            />
            <input
              type="text"
              aria-label={`${field.label} value for ${key}`}
              disabled={disabled}
              value={entryValue}
              onChange={(event) => commitRow(key, event.target.value, key)}
            />
            <Button
              compact
              type="button"
              disabled={disabled}
              aria-label={`Remove ${key}`}
              onClick={() => {
                const next = { ...map };
                delete next[key];
                onChange(next);
              }}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      <div className="workbench-field-remap-options__string-map-add">
        <input
          type="text"
          aria-label={`New ${field.label} key`}
          disabled={disabled}
          placeholder="Key"
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
        />
        <input
          type="text"
          aria-label={`New ${field.label} value`}
          disabled={disabled}
          placeholder="Value"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
        />
        <Button
          compact
          type="button"
          disabled={disabled || !draftKey.trim()}
          onClick={() => {
            commitRow(draftKey, draftValue);
            setDraftKey('');
            setDraftValue('');
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function JsonOptionEditor({
  controlId,
  field,
  value,
  disabled,
  onChange,
  testId,
}: {
  readonly controlId: string;
  readonly field: TransformOptionField;
  readonly value: unknown;
  readonly disabled: boolean;
  readonly onChange: (next: unknown) => void;
  readonly testId: string;
}): JSX.Element {
  const [draft, setDraft] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  );
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setDraft(value === undefined ? '' : JSON.stringify(value, null, 2));
    setError(undefined);
  }, [value]);

  return (
    <div className="workbench-field-remap-options__json">
      <textarea
        id={controlId}
        aria-label={field.label}
        data-testid={testId}
        disabled={disabled}
        rows={5}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(undefined);
        }}
        onBlur={(event) => {
          // Read from the DOM so blur after a same-tick edit is not stale.
          const trimmed = event.currentTarget.value.trim();
          if (!trimmed) {
            setError(undefined);
            onChange(undefined);
            return;
          }
          try {
            const parsed: unknown = JSON.parse(trimmed);
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
              setError('JSON must be a plain object.');
              return;
            }
            setError(undefined);
            setDraft(JSON.stringify(parsed, null, 2));
            onChange(parsed);
          } catch {
            setError('Invalid JSON.');
          }
        }}
      />
      {error ? (
        <p className="workbench-field-remap-options__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Presentational editor for `TransformOptionField` kinds (string / number / boolean /
 * stringMap / json). Emits the full options record for one transform step.
 */
export function TransformOptionsEditor({
  fields,
  value,
  onChange,
  disabled = false,
  testIdPrefix = 'field-remap-option',
}: TransformOptionsEditorProps): JSX.Element {
  const baseId = useId();

  if (fields.length === 0) {
    return (
      <p className="workbench-field-remap-options__empty" data-testid={`${testIdPrefix}-empty`}>
        No options for this transform.
      </p>
    );
  }

  const setKey = (key: string, nextValue: unknown) => {
    const next: Record<string, unknown> = { ...value };
    if (nextValue === undefined) {
      delete next[key];
    } else {
      next[key] = nextValue;
    }
    onChange(next);
  };

  return (
    <WorkbenchPropertyStack
      className="workbench-field-remap-options"
      data-field-remap-shortcuts="ignore"
      data-testid={`${testIdPrefix}-editor`}
      gap="sm"
    >
      {fields.map((field) => {
        const controlId = `${baseId}-${field.key}`;
        const testId = `${testIdPrefix}-${field.key}`;
        const current = value[field.key];

        if (field.kind === 'string') {
          return (
            <WorkbenchPropertyRow key={field.key} htmlFor={controlId} label={field.label}>
              <TextInput
                id={controlId}
                controlWidth="full"
                data-testid={testId}
                disabled={disabled}
                aria-label={field.label}
                value={
                  typeof current === 'string' ? current : current == null ? '' : String(current)
                }
                onValueChange={(next) => setKey(field.key, next)}
              />
            </WorkbenchPropertyRow>
          );
        }

        if (field.kind === 'number') {
          return (
            <WorkbenchPropertyRow key={field.key} htmlFor={controlId} label={field.label}>
              <NumberInput
                id={controlId}
                controlWidth="full"
                data-testid={testId}
                disabled={disabled}
                aria-label={field.label}
                nullable
                value={typeof current === 'number' ? current : undefined}
                onEmptyValue={() => setKey(field.key, undefined)}
                onValueChange={(next) => setKey(field.key, next)}
              />
            </WorkbenchPropertyRow>
          );
        }

        if (field.kind === 'boolean') {
          return (
            <WorkbenchPropertyRow key={field.key} htmlFor={controlId} label={field.label}>
              <Checkbox
                id={controlId}
                data-testid={testId}
                disabled={disabled}
                aria-label={field.label}
                checked={Boolean(current)}
                onCheckedChange={(next) => setKey(field.key, next)}
              />
            </WorkbenchPropertyRow>
          );
        }

        if (field.kind === 'stringMap') {
          return (
            <WorkbenchPropertyRow key={field.key} label={field.label}>
              <StringMapEditor
                field={field}
                value={current}
                disabled={disabled}
                testId={testId}
                onChange={(next) =>
                  setKey(field.key, Object.keys(next).length > 0 ? next : undefined)
                }
              />
            </WorkbenchPropertyRow>
          );
        }

        return (
          <WorkbenchPropertyRow key={field.key} htmlFor={controlId} label={field.label}>
            <JsonOptionEditor
              controlId={controlId}
              field={field}
              value={current}
              disabled={disabled}
              testId={testId}
              onChange={(next) => setKey(field.key, next)}
            />
          </WorkbenchPropertyRow>
        );
      })}
    </WorkbenchPropertyStack>
  );
}
