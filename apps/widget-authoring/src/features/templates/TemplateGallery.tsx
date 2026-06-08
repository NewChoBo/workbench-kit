import {
  EMPTY_PLAYGROUND_DOCUMENT,
  PLAYGROUND_STARTER_TEMPLATES,
  type PlaygroundStarterTemplate,
} from '@workbench-kit/react/json-widget/playground';

export interface TemplateGalleryProps {
  onSelectTemplate: (template: PlaygroundStarterTemplate) => void;
  onStartBlank?: (() => void) | undefined;
}

export function TemplateGallery({ onSelectTemplate, onStartBlank }: TemplateGalleryProps) {
  return (
    <div className="widget-authoring-gallery" data-testid="template-gallery">
      <header className="widget-authoring-gallery__hero">
        <h1 className="widget-authoring-gallery__title">What will you design today?</h1>
        <p className="widget-authoring-gallery__subtitle">
          Pick a starter layout or begin with a blank canvas.
        </p>
      </header>

      <div className="widget-authoring-gallery__actions">
        <button
          className="widget-authoring-gallery__blank"
          data-testid="template-gallery-start-blank"
          type="button"
          onClick={() => {
            if (onStartBlank) {
              onStartBlank();
              return;
            }
            onSelectTemplate({
              id: 'blank',
              label: 'Blank canvas',
              description: 'Empty grid canvas',
              document: EMPTY_PLAYGROUND_DOCUMENT,
            });
          }}
        >
          Start blank
        </button>
      </div>

      <section className="widget-authoring-gallery__section" aria-label="Starter templates">
        <h2 className="widget-authoring-gallery__section-title">Starter templates</h2>
        <div className="widget-authoring-gallery__grid">
          {PLAYGROUND_STARTER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="widget-authoring-gallery__card"
              data-testid={`gallery-template-${template.id}`}
              type="button"
              onClick={() => onSelectTemplate(template)}
            >
              <span className="widget-authoring-gallery__card-title">{template.label}</span>
              <span className="widget-authoring-gallery__card-description">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
