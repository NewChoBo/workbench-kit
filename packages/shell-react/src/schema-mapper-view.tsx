import type { JSX } from 'react';
import { WorkbenchActionSidebar } from '@workbench-kit/react/layout';

import './schema-mapper-view.css';

import {
  FIELD_REMAP_SAMPLES,
  resolveFieldRemapSampleId,
  type FieldRemapSampleId,
} from './field-remap-samples.js';
import {
  isSampleSchemaMapperViewRenderData,
  SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND,
  type SampleSchemaMapperViewRenderData,
} from './schema-mapper-view-data.js';
import { useActiveEditorTab, useEditorService } from './use-editor.js';

export type { SampleSchemaMapperViewRenderData };
export { isSampleSchemaMapperViewRenderData, SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND };

const SCHEMA_MAPPER_URI_PREFIX = 'workbench://schema-mapper/' as const;

export function buildSchemaMapperEditorUri(sampleId: FieldRemapSampleId | string): string {
  return `${SCHEMA_MAPPER_URI_PREFIX}${encodeURIComponent(sampleId)}`;
}

export function parseSchemaMapperEditorSampleId(
  resourceUri: string,
): FieldRemapSampleId | undefined {
  if (!resourceUri.startsWith(SCHEMA_MAPPER_URI_PREFIX)) {
    return undefined;
  }
  const encodedId = resourceUri.slice(SCHEMA_MAPPER_URI_PREFIX.length);
  if (!encodedId) {
    return undefined;
  }
  try {
    return resolveFieldRemapSampleId(decodeURIComponent(encodedId));
  } catch {
    return undefined;
  }
}

export interface SampleSchemaMapperViewProps {
  readonly className?: string | undefined;
}

/** Sidebar: catalog of field-remap / table-mapping samples. */
export function SampleSchemaMapperView({
  className,
}: SampleSchemaMapperViewProps = {}): JSX.Element {
  const editorService = useEditorService();
  const activeTab = useActiveEditorTab();
  const activeSampleId = activeTab
    ? parseSchemaMapperEditorSampleId(activeTab.resourceUri)
    : undefined;

  return (
    <WorkbenchActionSidebar
      className={['workbench-schema-mapper-view', className].filter(Boolean).join(' ')}
      data-testid="schema-mapper-view"
      items={FIELD_REMAP_SAMPLES.map((sample) => ({
        description: sample.description,
        icon: <i aria-hidden="true" className="codicon codicon-type-hierarchy" />,
        id: sample.id,
        label: sample.title,
        selected: activeSampleId === sample.id,
        testId: `schema-mapper-open-${sample.id}`,
        title: `Open ${sample.title}`,
      }))}
      listProps={{
        'aria-label': 'Field remap samples',
        className: 'workbench-schema-mapper-view__list',
      }}
      onSelect={(item) => {
        const sample = FIELD_REMAP_SAMPLES.find((entry) => entry.id === item.id);
        if (!sample) {
          return;
        }
        editorService.openEditor({
          icon: 'codicon-type-hierarchy',
          pinned: true,
          preview: false,
          resourceUri: buildSchemaMapperEditorUri(sample.id),
          title: sample.title,
        });
      }}
    />
  );
}
