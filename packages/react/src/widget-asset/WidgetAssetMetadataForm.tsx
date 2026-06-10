import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';

import {
  WorkbenchPropertySelectRow,
  WorkbenchPropertyStack,
  WorkbenchPropertySection,
  WorkbenchPropertyTextRow,
} from '../layout/WorkbenchPropertyPanel';

const CATEGORY_OPTIONS = [
  { label: 'Content', value: 'content' },
  { label: 'Layout', value: 'layout' },
];

export interface WidgetAssetMetadataFormProps {
  readonly asset: WidgetPlacementAsset;
  readonly readOnly?: boolean | undefined;
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly onChange: (next: WidgetPlacementAsset) => void;
}

export function WidgetAssetMetadataForm({
  asset,
  onChange,
  readOnly = false,
  registry,
}: WidgetAssetMetadataFormProps) {
  const widgetTypeOptions = registry?.types().map((type) => ({
    label: registry.definition(type)?.displayName ?? type,
    value: type,
  })) ?? [{ label: asset.widgetType, value: asset.widgetType }];

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
        <WorkbenchPropertyTextRow
          label="Icon"
          placeholder="codicon-symbol-text"
          readOnly={readOnly}
          value={asset.icon ?? ''}
          onValueChange={(next) => patch({ icon: next.length > 0 ? next : undefined })}
        />
        <WorkbenchPropertySelectRow
          label="Widget type"
          disabled={readOnly}
          options={widgetTypeOptions}
          value={asset.widgetType}
          onValueChange={(next) =>
            patch({
              widgetType: next,
              defaultWidget: {
                ...asset.defaultWidget,
                type: next,
              },
            })
          }
        />
      </WorkbenchPropertySection>
    </WorkbenchPropertyStack>
  );
}
