import type { WidgetPlacementAsset, WidgetPlacementAssetKind } from '@workbench-kit/contracts';

import {
  WorkbenchPropertySelectRow,
  WorkbenchPropertyStack,
  WorkbenchPropertySection,
  WorkbenchPropertyTextRow,
} from '../layout/WorkbenchPropertyPanel';

const CATEGORY_OPTIONS = [
  { label: 'Content', value: 'content' },
  { label: 'Layout', value: 'layout' },
  { label: 'Template', value: 'template' },
];

const KIND_OPTIONS: { label: string; value: WidgetPlacementAssetKind }[] = [
  { label: 'Leaf', value: 'leaf' },
  { label: 'Container', value: 'container' },
  { label: 'Template', value: 'template' },
];

export interface WidgetAssetMetadataFormProps {
  readonly asset: WidgetPlacementAsset;
  readonly readOnly?: boolean | undefined;
  readonly onChange: (next: WidgetPlacementAsset) => void;
}

export function WidgetAssetMetadataForm({
  asset,
  onChange,
  readOnly = false,
}: WidgetAssetMetadataFormProps) {
  const patch = (patchValue: Partial<WidgetPlacementAsset>) => {
    onChange({ ...asset, ...patchValue });
  };

  return (
    <WorkbenchPropertyStack>
      <WorkbenchPropertySection title="Asset">
        <WorkbenchPropertyTextRow
          label="ID"
          readOnly={readOnly}
          value={asset.id}
          onValueChange={(next) => patch({ id: next })}
        />
        <WorkbenchPropertyTextRow
          label="Label"
          readOnly={readOnly}
          value={asset.label}
          onValueChange={(next) => patch({ label: next })}
        />
        <WorkbenchPropertyTextRow
          label="Description"
          readOnly={readOnly}
          value={asset.description ?? ''}
          onValueChange={(next) => patch({ description: next.length > 0 ? next : undefined })}
        />
        <WorkbenchPropertySelectRow
          label="Category"
          disabled={readOnly}
          options={CATEGORY_OPTIONS}
          value={asset.category}
          onValueChange={(next) => patch({ category: next })}
        />
        <WorkbenchPropertySelectRow
          label="Kind"
          disabled={readOnly}
          options={KIND_OPTIONS}
          value={asset.kind ?? 'leaf'}
          onValueChange={(next) => patch({ kind: next })}
        />
        <WorkbenchPropertyTextRow
          label="Icon"
          placeholder="codicon-symbol-text"
          readOnly={readOnly}
          value={asset.icon ?? ''}
          onValueChange={(next) => patch({ icon: next.length > 0 ? next : undefined })}
        />
      </WorkbenchPropertySection>
    </WorkbenchPropertyStack>
  );
}
