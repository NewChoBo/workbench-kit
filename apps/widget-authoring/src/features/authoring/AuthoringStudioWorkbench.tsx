import { useCallback, useMemo } from 'react';
import {
  PLAYGROUND_WIDGET_TEMPLATES,
  WidgetAuthoringWorkbench,
  insertPlaygroundWidget,
  type WidgetAuthoringWorkbenchProps,
} from '@workbench-kit/react/json-widget/playground';

import { AssetLibraryPanel } from '../assets/AssetLibraryPanel.js';
import { toAssetSrc } from '../assets/asset-reference.js';
import type { AuthoringAsset } from '../assets/asset-types.js';
import { useAssetLibrary } from '../assets/useAssetLibrary.js';
import { AuthoringChatPanel } from '../chat/AuthoringChatPanel.js';
import { useSidebarPlacement } from './useSidebarPlacement.js';

type AuthoringStudioWorkbenchProps = Omit<
  WidgetAuthoringWorkbenchProps,
  'imageSrcAssets' | 'resolveAssetSrc' | 'leftPanelTabs'
>;

export function AuthoringStudioWorkbench({
  initialValue,
  onDocumentChange,
  value,
  ...workbenchProps
}: AuthoringStudioWorkbenchProps) {
  const assetLibrary = useAssetLibrary();
  const { placement, setPlacement } = useSidebarPlacement();

  const handlePlaceAsset = useCallback(
    (asset: AuthoringAsset) => {
      const currentValue = value ?? initialValue;
      if (!currentValue) return;

      if (asset.type === 'image' || asset.type === 'icon') {
        const imageTemplate = PLAYGROUND_WIDGET_TEMPLATES.find(
          (template) => template.id === 'image',
        );
        if (!imageTemplate) return;

        const next = insertPlaygroundWidget(currentValue, imageTemplate, null, {
          childOverride: {
            type: 'image',
            src: toAssetSrc(asset.id),
            fit: asset.type === 'icon' ? 'contain' : 'cover',
            borderRadius: asset.type === 'icon' ? 0 : 8,
            col: 0,
            row: 0,
          },
        });

        if (next) {
          onDocumentChange?.(next);
        }
        return;
      }

      if (asset.type === 'color') {
        const tileTemplate = PLAYGROUND_WIDGET_TEMPLATES.find((template) => template.id === 'tile');
        if (!tileTemplate) return;

        const next = insertPlaygroundWidget(currentValue, tileTemplate, null, {
          childOverride: {
            type: 'tile',
            label: asset.name,
            layers: [{ type: 'color', color: toAssetSrc(asset.id) }],
            col: 0,
            row: 0,
          },
        });

        if (next) {
          onDocumentChange?.(next);
        }
      }
    },
    [initialValue, onDocumentChange, value],
  );

  const imageSrcAssets = useMemo(
    () =>
      assetLibrary.assets
        .filter((asset) => asset.type === 'image' || asset.type === 'icon')
        .map((asset) => ({
          id: asset.id,
          label: asset.name,
          previewSrc: assetLibrary.getDataUrl(asset.id) ?? '',
          reference: toAssetSrc(asset.id),
        }))
        .filter((asset) => asset.previewSrc.length > 0),
    [assetLibrary.assets, assetLibrary.getDataUrl],
  );

  const assetsTab = useMemo(
    () => ({
      id: 'assets',
      label: 'Assets',
      content: (
        <AssetLibraryPanel
          assets={assetLibrary.assets}
          error={assetLibrary.error}
          getDataUrl={assetLibrary.getDataUrl}
          getRecord={assetLibrary.getRecord}
          isLoading={assetLibrary.isLoading}
          onCreateAsset={async (input) => {
            await assetLibrary.createAssetEntry(input);
          }}
          onDuplicateAsset={async (assetId) => {
            await assetLibrary.duplicateAssetEntry(assetId);
          }}
          onImportImage={async (file) => {
            await assetLibrary.importImage(file);
          }}
          onPasteImage={async (dataUrl) => {
            await assetLibrary.importImageFromClipboard(dataUrl);
          }}
          onPlaceAsset={handlePlaceAsset}
          onRemoveAsset={assetLibrary.removeAsset}
          onUpdateAsset={async (assetId, input) => {
            await assetLibrary.updateAssetEntry(assetId, input);
          }}
        />
      ),
    }),
    [
      assetLibrary.assets,
      assetLibrary.createAssetEntry,
      assetLibrary.duplicateAssetEntry,
      assetLibrary.error,
      assetLibrary.getDataUrl,
      assetLibrary.getRecord,
      assetLibrary.importImage,
      assetLibrary.importImageFromClipboard,
      assetLibrary.isLoading,
      assetLibrary.removeAsset,
      assetLibrary.updateAssetEntry,
      handlePlaceAsset,
    ],
  );

  return (
    <WidgetAuthoringWorkbench
      {...workbenchProps}
      imageSrcAssets={imageSrcAssets}
      initialValue={initialValue}
      resolveAssetSrc={assetLibrary.resolveAssetSrc}
      leftPanelTabs={[assetsTab]}
      renderRightSidebar={() => <AuthoringChatPanel />}
      showSidebarMoveControls
      sidebarPlacement={placement}
      value={value}
      onSidebarPlacementChange={setPlacement}
      onDocumentChange={onDocumentChange}
    />
  );
}
