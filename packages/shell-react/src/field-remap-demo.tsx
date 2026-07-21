import type { JSX } from 'react';

import { FieldRemapPanel } from './field-remap-panel.js';
import { getFieldRemapSample, type FieldRemapSampleId } from './field-remap-samples.js';

export interface SampleFieldRemapDemoProps {
  readonly sampleId?: FieldRemapSampleId | string | undefined;
}

/**
 * Sample host wrapper around {@link FieldRemapPanel}.
 */
export function SampleFieldRemapDemo({
  sampleId = 'nested-ab',
}: SampleFieldRemapDemoProps = {}): JSX.Element {
  const sample = getFieldRemapSample(sampleId);
  return <FieldRemapPanel key={sample.id} sample={sample} />;
}
