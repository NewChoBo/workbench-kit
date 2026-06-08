import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { parseColorAssetDataUrl } from './asset-content.js';
import type { AssetCreateInput, AssetUpdateInput, AuthoringAssetRecord } from './asset-types.js';

export type AssetDialogMode = 'create' | 'edit';

export type AssetDialogType = 'image' | 'icon' | 'color';

export interface AssetCreateDialogProps {
  busy?: boolean | undefined;
  error?: string | null | undefined;
  mode: AssetDialogMode;
  onClose: () => void;
  onSubmit: (
    input: AssetCreateInput | { assetId: string; input: AssetUpdateInput },
  ) => Promise<void>;
  open: boolean;
  record?: AuthoringAssetRecord | null | undefined;
  initialType?: AssetDialogType | undefined;
}

const TYPE_OPTIONS: { id: AssetDialogType; label: string; description: string }[] = [
  { id: 'image', label: 'Image', description: 'Upload or replace a raster image.' },
  { id: 'icon', label: 'SVG icon', description: 'Paste SVG markup for scalable icons.' },
  { id: 'color', label: 'Color', description: 'Save a named swatch for tiles and fills.' },
];

function defaultSvgSnippet(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="9" />
</svg>`;
}

function recordToDialogType(record: AuthoringAssetRecord): AssetDialogType {
  if (record.type === 'icon') return 'icon';
  if (record.type === 'color') return 'color';
  return 'image';
}

export function AssetCreateDialog({
  busy = false,
  error = null,
  initialType = 'image',
  mode,
  onClose,
  onSubmit,
  open,
  record = null,
}: AssetCreateDialogProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetType, setAssetType] = useState<AssetDialogType>(initialType);
  const [name, setName] = useState('');
  const [svg, setSvg] = useState(defaultSvgSnippet);
  const [color, setColor] = useState('#3b82f6');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && record) {
      setAssetType(recordToDialogType(record));
      setName(record.name);
      if (record.type === 'icon') {
        setSvg(extractSvgFromDataUrl(record.dataUrl) ?? defaultSvgSnippet());
      }
      if (record.type === 'color') {
        setColor(parseColorAssetDataUrl(record.dataUrl) ?? '#3b82f6');
      }
      setFile(null);
      setLocalError(null);
      return;
    }

    setAssetType(initialType);
    setName('');
    setSvg(defaultSvgSnippet());
    setColor('#3b82f6');
    setFile(null);
    setLocalError(null);
  }, [initialType, mode, open, record]);

  if (!open) return null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    setFile(nextFile);
    if (nextFile && !name.trim()) {
      setName(nextFile.name.replace(/\.[^.]+$/, '') || nextFile.name);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Name is required.');
      return;
    }

    try {
      if (mode === 'edit' && record) {
        if (record.type === 'image') {
          await onSubmit({
            assetId: record.id,
            input: { name: trimmedName, ...(file ? { file } : {}) },
          });
        } else if (record.type === 'icon') {
          await onSubmit({ assetId: record.id, input: { name: trimmedName, svg } });
        } else {
          await onSubmit({ assetId: record.id, input: { name: trimmedName, color } });
        }
        return;
      }

      if (assetType === 'image') {
        if (!file) {
          setLocalError('Choose an image file to upload.');
          return;
        }
        await onSubmit({ type: 'image', name: trimmedName, file });
        return;
      }

      if (assetType === 'icon') {
        await onSubmit({ type: 'icon', name: trimmedName, svg });
        return;
      }

      await onSubmit({ type: 'color', name: trimmedName, color });
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'Failed to save asset');
    }
  };

  const displayError = localError ?? error;
  const lockedType = mode === 'edit';

  return (
    <div className="asset-dialog-backdrop" data-testid="asset-create-dialog">
      <div aria-labelledby={titleId} aria-modal="true" className="asset-dialog" role="dialog">
        <header className="asset-dialog__header">
          <h3 className="asset-dialog__title" id={titleId}>
            {mode === 'edit' ? 'Edit asset' : 'Create asset'}
          </h3>
          <button
            aria-label="Close"
            className="asset-dialog__close"
            disabled={busy}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="asset-dialog__body" onSubmit={(event) => void handleSubmit(event)}>
          {!lockedType ? (
            <fieldset className="asset-dialog__type-grid">
              <legend className="asset-dialog__legend">Asset type</legend>
              {TYPE_OPTIONS.map((option) => {
                const selected = assetType === option.id;
                return (
                  <label
                    key={option.id}
                    className="asset-dialog__type-card"
                    data-selected={selected ? 'true' : 'false'}
                  >
                    <input
                      checked={selected}
                      className="asset-dialog__type-input"
                      name="asset-type"
                      type="radio"
                      value={option.id}
                      onChange={() => setAssetType(option.id)}
                    />
                    <span className="asset-dialog__type-label">{option.label}</span>
                    <span className="asset-dialog__type-description">{option.description}</span>
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <p className="asset-dialog__locked-type">
              Type: <strong>{record?.type ?? assetType}</strong>
            </p>
          )}

          <label className="asset-dialog__field">
            <span className="asset-dialog__label">Name</span>
            <input
              className="asset-dialog__input"
              data-testid="asset-dialog-name"
              disabled={busy}
              placeholder="Hero banner"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {assetType === 'image' ? (
            <div className="asset-dialog__field">
              <span className="asset-dialog__label">
                {mode === 'edit' ? 'Replace image (optional)' : 'Image file'}
              </span>
              <button
                className="asset-dialog__file-button"
                data-testid="asset-dialog-file-button"
                disabled={busy}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? file.name : mode === 'edit' ? 'Choose new file' : 'Choose file'}
              </button>
              <input
                ref={fileInputRef}
                accept="image/*,.svg,image/svg+xml"
                className="asset-dialog__file-input"
                type="file"
                onChange={handleFileChange}
              />
            </div>
          ) : null}

          {assetType === 'icon' ? (
            <label className="asset-dialog__field">
              <span className="asset-dialog__label">SVG markup</span>
              <textarea
                className="asset-dialog__textarea"
                data-testid="asset-dialog-svg"
                disabled={busy}
                rows={8}
                spellCheck={false}
                value={svg}
                onChange={(event) => setSvg(event.target.value)}
              />
            </label>
          ) : null}

          {assetType === 'color' ? (
            <label className="asset-dialog__field asset-dialog__field--color">
              <span className="asset-dialog__label">Color</span>
              <div className="asset-dialog__color-row">
                <input
                  className="asset-dialog__color-input"
                  data-testid="asset-dialog-color"
                  disabled={busy}
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
                <input
                  className="asset-dialog__input asset-dialog__input--mono"
                  disabled={busy}
                  placeholder="#3b82f6"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </div>
            </label>
          ) : null}

          {displayError ? (
            <p className="asset-dialog__error" role="alert">
              {displayError}
            </p>
          ) : null}

          <footer className="asset-dialog__footer">
            <button
              className="asset-dialog__button asset-dialog__button--ghost"
              disabled={busy}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="asset-dialog__button asset-dialog__button--primary"
              data-testid="asset-dialog-save"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create asset'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function extractSvgFromDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith('data:image/svg+xml')) return null;
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return null;
  const payload = dataUrl.slice(commaIndex + 1);
  try {
    if (dataUrl.includes(';base64')) {
      return atob(payload);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}
