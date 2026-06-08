import type { PlaygroundWidgetTemplate } from '../json-widget/playground/demo-registry.js';
import { PLAYGROUND_WIDGET_TEMPLATES } from '../json-widget/playground/demo-registry.js';
import {
  WorkbenchPropertyHint,
  WorkbenchPropertyPanel,
  WorkbenchSectionTitle,
} from '../layout/WorkbenchPropertyPanel';
import { cxCodicon } from '../utils/codicon';
import { setAuthoringDragData } from './authoring-drop.js';
import { paletteItemDescription, widgetTypeIcon } from './widget-type-icons.js';

export interface ComponentPalettePanelProps {
  onInsert: (template: PlaygroundWidgetTemplate) => void;
  readOnly?: boolean | undefined;
  templates?: readonly PlaygroundWidgetTemplate[] | undefined;
}

export function ComponentPalettePanel({
  onInsert,
  readOnly = false,
  templates = PLAYGROUND_WIDGET_TEMPLATES,
}: ComponentPalettePanelProps) {
  return (
    <WorkbenchPropertyPanel className="ui-component-palette-panel">
      <WorkbenchSectionTitle>Components</WorkbenchSectionTitle>
      <WorkbenchPropertyHint>
        Click to insert at the selection, or drag onto the canvas.
      </WorkbenchPropertyHint>
      <div className="ui-component-palette-panel__grid" role="list">
        {templates.map((template) => {
          const description = paletteItemDescription(template.id);
          const icon = widgetTypeIcon(template.id);

          return (
            <button
              key={template.id}
              className="ui-component-palette-panel__item"
              data-testid={`palette-${template.id}`}
              disabled={readOnly}
              draggable={!readOnly}
              role="listitem"
              title={`Insert ${template.label}`}
              type="button"
              onClick={() => onInsert(template)}
              onDragStart={(event) => {
                if (readOnly) return;
                setAuthoringDragData(event.dataTransfer, {
                  kind: 'template',
                  templateId: template.id,
                });
              }}
            >
              <span className="ui-component-palette-panel__item-icon" aria-hidden>
                <span className={cxCodicon(icon)} />
              </span>
              <span className="ui-component-palette-panel__item-copy">
                <span className="ui-component-palette-panel__item-label">{template.label}</span>
                {description ? (
                  <span className="ui-component-palette-panel__item-description">
                    {description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </WorkbenchPropertyPanel>
  );
}
