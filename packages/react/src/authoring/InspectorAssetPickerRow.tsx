import {
  WorkbenchPropertyHint,
  WorkbenchPropertyStack,
  WorkbenchPropertyTextRow,
} from '../layout/WorkbenchPropertyPanel';

export interface InspectorAssetOption {
  id: string;
  label: string;
  previewSrc: string;
  reference: string;
}

export interface InspectorAssetPickerRowProps {
  assets: readonly InspectorAssetOption[];
  label: string;
  readOnly?: boolean | undefined;
  value: string;
  onValueChange: (next: string) => void;
}

export function InspectorAssetPickerRow({
  assets,
  label,
  readOnly = false,
  value,
  onValueChange,
}: InspectorAssetPickerRowProps) {
  return (
    <WorkbenchPropertyStack>
      <WorkbenchPropertyTextRow
        label={label}
        readOnly={readOnly}
        value={value}
        onValueChange={onValueChange}
      />
      {assets.length > 0 ? (
        <div className="ui-inspector-asset-picker" data-testid="inspector-asset-picker">
          <WorkbenchPropertyHint>Pick from library</WorkbenchPropertyHint>
          <div className="ui-inspector-asset-picker__grid" role="list">
            {assets.map((asset) => {
              const selected = value === asset.reference;
              return (
                <button
                  key={asset.id}
                  className="ui-inspector-asset-picker__item"
                  data-selected={selected ? 'true' : 'false'}
                  data-testid={`inspector-asset-${asset.id}`}
                  disabled={readOnly}
                  role="listitem"
                  title={asset.label}
                  type="button"
                  onClick={() => onValueChange(asset.reference)}
                >
                  <img
                    alt=""
                    className="ui-inspector-asset-picker__thumb"
                    draggable={false}
                    src={asset.previewSrc}
                  />
                  <span className="ui-inspector-asset-picker__label">{asset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </WorkbenchPropertyStack>
  );
}
