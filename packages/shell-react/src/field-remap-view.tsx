import type { JSX } from 'react';
import { WorkbenchActionSidebar } from '@workbench-kit/react/layout';

import './field-remap-view.css';

import {
  FIELD_REMAP_SAMPLES,
  resolveFieldRemapSampleId,
  type FieldRemapSampleId,
} from './field-remap-samples.js';
import {
  isSampleFieldRemapViewRenderData,
  SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND,
  type SampleFieldRemapViewRenderData,
} from './field-remap-view-data.js';
import { useActiveEditorTab, useEditorService } from './use-editor.js';

export type { SampleFieldRemapViewRenderData };
export { isSampleFieldRemapViewRenderData, SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND };

const FIELD_REMAP_URI_PREFIX = 'workbench://field-remap/' as const;

export function buildFieldRemapEditorUri(sampleId: FieldRemapSampleId | string): string {
  return `${FIELD_REMAP_URI_PREFIX}${encodeURIComponent(sampleId)}`;
}

export function parseFieldRemapEditorSampleId(resourceUri: string): FieldRemapSampleId | undefined {
  if (!resourceUri.startsWith(FIELD_REMAP_URI_PREFIX)) {
    return undefined;
  }
  const encodedId = resourceUri.slice(FIELD_REMAP_URI_PREFIX.length);
  if (!encodedId) {
    return undefined;
  }
  try {
    return resolveFieldRemapSampleId(decodeURIComponent(encodedId));
  } catch {
    return undefined;
  }
}

export interface SampleFieldRemapViewProps {
  readonly className?: string | undefined;
}

/** Sidebar: catalog of field-remap / table-mapping samples. */
export function SampleFieldRemapView({ className }: SampleFieldRemapViewProps = {}): JSX.Element {
  const editorService = useEditorService();
  const activeTab = useActiveEditorTab();
  const activeSampleId = activeTab
    ? parseFieldRemapEditorSampleId(activeTab.resourceUri)
    : undefined;

  return (
    <WorkbenchActionSidebar
      className={['workbench-field-remap-view', className].filter(Boolean).join(' ')}
      data-testid="field-remap-view"
      items={FIELD_REMAP_SAMPLES.map((sample) => ({
        description: sample.description,
        icon: <i aria-hidden="true" className="codicon codicon-type-hierarchy" />,
        id: sample.id,
        label: sample.title,
        selected: activeSampleId === sample.id,
        testId: `field-remap-open-${sample.id}`,
        title: `Open ${sample.title}`,
      }))}
      listProps={{
        'aria-label': 'Field remap samples',
        className: 'workbench-field-remap-view__list',
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
          resourceUri: buildFieldRemapEditorUri(sample.id),
          title: sample.title,
        });
      }}
    />
  );
}
