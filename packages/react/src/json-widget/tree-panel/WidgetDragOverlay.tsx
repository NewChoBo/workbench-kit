import type { DragNodeData } from './types.js';

export function WidgetDragOverlay({ data }: { data: DragNodeData | null }) {
  if (!data) return null;

  return (
    <div className="ui-json-widget-tree-drag-overlay" aria-hidden>
      {data.displayName}
    </div>
  );
}
