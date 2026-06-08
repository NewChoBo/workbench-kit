import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import {
  AssetCreateDialog,
  type AssetDialogMode,
  type AssetDialogType,
} from './AssetCreateDialog.js';
import { parseColorAssetDataUrl, canDragAssetToCanvas, dragAssetType } from './asset-content.js';
import { toAssetSrc } from './asset-reference.js';
import type {
  AssetCreateInput,
  AssetUpdateInput,
  AuthoringAsset,
  AuthoringAssetRecord,
} from './asset-types.js';
import { setAuthoringDragData } from '@workbench-kit/react/authoring';

export interface AssetLibraryPanelProps {
  assets: AuthoringAsset[];
  error?: string | null | undefined;
  getDataUrl: (assetId: string) => string | null;
  getRecord: (assetId: string) => AuthoringAssetRecord | null;
  isLoading?: boolean | undefined;
  onCreateAsset: (input: AssetCreateInput) => Promise<void>;
  onDuplicateAsset: (assetId: string) => Promise<void>;
  onImportImage: (file: File) => Promise<void>;
  onPasteImage?: ((dataUrl: string) => Promise<void>) | undefined;
  onPlaceAsset?: ((asset: AuthoringAsset) => void) | undefined;
  onRemoveAsset: (assetId: string) => Promise<void>;
  onUpdateAsset: (assetId: string, input: AssetUpdateInput) => Promise<void>;
  readOnly?: boolean | undefined;
}

export function AssetLibraryPanel({
  assets,
  error = null,
  getDataUrl,
  getRecord,
  isLoading = false,
  onCreateAsset,
  onDuplicateAsset,
  onImportImage,
  onPasteImage,
  onPlaceAsset,
  onRemoveAsset,
  onUpdateAsset,
  readOnly = false,
}: AssetLibraryPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<AssetDialogMode>('create');
  const [dialogType, setDialogType] = useState<AssetDialogType>('image');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (readOnly || !onPasteImage) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        void (async () => {
          setBusy(true);
          try {
            const dataUrl = await readFileAsDataUrl(file);
            await onPasteImage(dataUrl);
          } finally {
            setBusy(false);
          }
        })();
        return;
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onPasteImage, readOnly]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || readOnly) return;

    setBusy(true);
    try {
      await onImportImage(file);
    } finally {
      setBusy(false);
    }
  };

  const openCreateDialog = (type: AssetDialogType = 'image') => {
    setDialogMode('create');
    setDialogType(type);
    setEditingAssetId(null);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (assetId: string) => {
    setDialogMode('edit');
    setEditingAssetId(assetId);
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (
    input: AssetCreateInput | { assetId: string; input: AssetUpdateInput },
  ) => {
    setBusy(true);
    setDialogError(null);
    try {
      if ('assetId' in input) {
        await onUpdateAsset(input.assetId, input.input);
      } else {
        await onCreateAsset(input);
      }
      setDialogOpen(false);
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Failed to save asset');
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const editingRecord = editingAssetId ? getRecord(editingAssetId) : null;

  return (
    <div className="asset-library-panel" data-testid="asset-library-panel">
      <div className="asset-library-panel__header">
        <h3 className="asset-library-panel__title">Assets</h3>
        <p className="asset-library-panel__hint">
          Create images, SVG icons, and color swatches. Drag or click to place on the canvas.
        </p>
      </div>

      <div className="asset-library-panel__actions">
        <button
          className="asset-library-panel__create"
          data-testid="asset-create-button"
          disabled={readOnly || busy}
          type="button"
          onClick={() => openCreateDialog('image')}
        >
          Create asset
        </button>
        <button
          className="asset-library-panel__upload"
          data-testid="asset-upload-button"
          disabled={readOnly || busy}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Working…' : 'Quick upload'}
        </button>
        <input
          ref={inputRef}
          accept="image/*,.svg,image/svg+xml"
          className="asset-library-panel__file-input"
          data-testid="asset-upload-input"
          type="file"
          onChange={(event) => void handleFileChange(event)}
        />
      </div>

      {onPasteImage ? (
        <p className="asset-library-panel__paste-hint">
          Tip: paste an image from the clipboard anywhere in the app.
        </p>
      ) : null}

      {error ? (
        <p className="asset-library-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? <p className="asset-library-panel__status">Loading assets…</p> : null}

      {!isLoading && assets.length === 0 ? (
        <p className="asset-library-panel__empty">
          No assets yet. Create one or upload an image to get started.
        </p>
      ) : null}

      <ul className="asset-library-panel__grid" role="list">
        {assets.map((asset) => {
          const previewUrl = getDataUrl(asset.id);
          const colorValue =
            asset.type === 'color'
              ? parseColorAssetDataUrl(getRecord(asset.id)?.dataUrl ?? '')
              : null;
          const draggable = !readOnly && canDragAssetToCanvas(asset.type);
          const dragType = dragAssetType(asset.type);

          return (
            <li key={asset.id} className="asset-library-panel__card" role="listitem">
              <button
                className="asset-library-panel__card-main"
                data-testid={`asset-card-${asset.id}`}
                disabled={readOnly}
                draggable={draggable}
                title={`Place ${asset.name}`}
                type="button"
                onClick={() => onPlaceAsset?.(asset)}
                onDragStart={(event) => {
                  if (!draggable || !dragType) return;
                  setAuthoringDragData(event.dataTransfer, {
                    kind: 'asset',
                    assetId: asset.id,
                    assetType: dragType,
                  });
                }}
              >
                <span className="asset-library-panel__thumb">
                  {asset.type === 'color' && colorValue ? (
                    <span
                      className="asset-library-panel__color-swatch"
                      style={{ backgroundColor: colorValue }}
                    />
                  ) : previewUrl ? (
                    <img alt={asset.name} src={previewUrl} />
                  ) : (
                    <span className="asset-library-panel__thumb-fallback">{asset.type}</span>
                  )}
                </span>
                <span className="asset-library-panel__name">{asset.name}</span>
                <span className="asset-library-panel__meta">{toAssetSrc(asset.id)}</span>
                <span className="asset-library-panel__badge">{asset.type}</span>
              </button>
              <div className="asset-library-panel__card-actions">
                <button
                  className="asset-library-panel__action"
                  data-testid={`asset-edit-${asset.id}`}
                  disabled={readOnly || busy}
                  type="button"
                  onClick={() => openEditDialog(asset.id)}
                >
                  Edit
                </button>
                <button
                  className="asset-library-panel__action"
                  data-testid={`asset-duplicate-${asset.id}`}
                  disabled={readOnly || busy}
                  type="button"
                  onClick={() => void onDuplicateAsset(asset.id)}
                >
                  Duplicate
                </button>
                <button
                  className="asset-library-panel__remove"
                  data-testid={`asset-remove-${asset.id}`}
                  disabled={readOnly || busy}
                  title={`Remove ${asset.name}`}
                  type="button"
                  onClick={() => void onRemoveAsset(asset.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <AssetCreateDialog
        busy={busy}
        error={dialogError}
        initialType={dialogType}
        mode={dialogMode}
        open={dialogOpen}
        record={editingRecord}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read clipboard image'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read clipboard image'));
    reader.readAsDataURL(file);
  });
}
