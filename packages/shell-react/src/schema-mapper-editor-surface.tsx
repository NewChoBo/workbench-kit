import type { JSX } from 'react';
import { ScrollArea } from '@workbench-kit/react/primitives';

import { SampleSchemaMapperDemo } from './schema-mapper-demo.js';
import { resolveFieldRemapSampleId } from './field-remap-samples.js';
import './schema-mapper-view.css';

export type SchemaMapperEditorSurfaceId = string;

export interface SchemaMapperEditorSurfaceProps {
  readonly resourceUri: string;
  readonly surfaceId: SchemaMapperEditorSurfaceId;
  readonly tabId: string;
}

export function SchemaMapperEditorSurface({
  resourceUri,
  surfaceId,
  tabId,
}: SchemaMapperEditorSurfaceProps): JSX.Element {
  const sampleId = resolveFieldRemapSampleId(surfaceId);

  return (
    <ScrollArea
      aria-label={`${sampleId} field remap`}
      className="workbench-schema-mapper-editor-surface"
      data-editor-host-id={tabId}
      data-resource-uri={resourceUri}
      data-sample-id={sampleId}
      data-testid="schema-mapper-editor-surface"
      orientation="vertical"
    >
      <SampleSchemaMapperDemo sampleId={sampleId} />
    </ScrollArea>
  );
}
