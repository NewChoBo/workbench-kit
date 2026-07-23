import type { JSX } from 'react';
import { ScrollArea } from '@workbench-kit/react/primitives';

import { SampleFieldRemapDemo } from './demo.js';
import { resolveFieldRemapSampleId } from './samples.js';
import './view.css';

export type FieldRemapEditorSurfaceId = string;

export interface FieldRemapEditorSurfaceProps {
  readonly resourceUri: string;
  readonly surfaceId: FieldRemapEditorSurfaceId;
  readonly tabId: string;
}

export function FieldRemapEditorSurface({
  resourceUri,
  surfaceId,
  tabId,
}: FieldRemapEditorSurfaceProps): JSX.Element {
  const sampleId = resolveFieldRemapSampleId(surfaceId);

  return (
    <ScrollArea
      aria-label={`${sampleId} field remap`}
      className="workbench-field-remap-editor-surface"
      data-editor-host-id={tabId}
      data-resource-uri={resourceUri}
      data-sample-id={sampleId}
      data-testid="field-remap-editor-surface"
      orientation="vertical"
    >
      <SampleFieldRemapDemo sampleId={sampleId} />
    </ScrollArea>
  );
}
