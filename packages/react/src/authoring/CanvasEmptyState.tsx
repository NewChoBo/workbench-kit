import type { PlaygroundWidgetTemplate } from '../json-widget/playground/demo-registry.js';
import { cxCodicon } from '../utils/codicon';
import { widgetTypeIcon } from './widget-type-icons.js';

export interface CanvasEmptyStateProps {
  onInsertTemplate: (template: PlaygroundWidgetTemplate) => void;
  quickTemplates: readonly PlaygroundWidgetTemplate[];
}

export function CanvasEmptyState({ onInsertTemplate, quickTemplates }: CanvasEmptyStateProps) {
  return (
    <div className="ui-canvas-empty-state" data-testid="canvas-empty-state">
      <div className="ui-canvas-empty-state__card">
        <span className="ui-canvas-empty-state__icon" aria-hidden>
          <span className={cxCodicon('add')} />
        </span>
        <p className="ui-canvas-empty-state__title">Start building your layout</p>
        <p className="ui-canvas-empty-state__hint">
          Drag components from the left panel, drop assets here, or pick a quick start below.
        </p>
        <div className="ui-canvas-empty-state__actions">
          {quickTemplates.map((template) => (
            <button
              key={template.id}
              className="ui-canvas-empty-state__action"
              data-testid={`empty-cta-${template.id}`}
              type="button"
              onClick={() => onInsertTemplate(template)}
            >
              <span className="ui-canvas-empty-state__action-icon" aria-hidden>
                <span className={cxCodicon(widgetTypeIcon(template.id))} />
              </span>
              <span className="ui-canvas-empty-state__action-label">Add {template.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
