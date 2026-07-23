import { useMemo, useState } from 'react';
import { createScreenSpecPaletteAssetCatalog } from '@workbench-kit/jdw';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';
import { WidgetTreeLab } from '@workbench-kit/react/widget-tree';
import { Field, Select, WorkbenchAuthoringShell } from '@workbench-kit/react/primitives';
import {
  JDW_SAMPLE_SCREENS,
  formatJdwSampleScreenJson,
  type JdwSampleScreenDefinition,
} from '@workbench-kit/react/jdw/samples';

export interface JdwSampleScreenExplorerProps {
  readonly samples?: readonly JdwSampleScreenDefinition[] | undefined;
  readonly initialSampleId?: string | undefined;
}

function resolveSample(
  samples: readonly JdwSampleScreenDefinition[],
  sampleId: string,
): JdwSampleScreenDefinition {
  return samples.find((entry) => entry.id === sampleId) ?? samples[0]!;
}

/**
 * Compiles a selected Screen Spec template once, then opens the resulting JDW
 * document in the canonical WidgetTreeLab design/code authoring surface.
 */
export function JdwSampleScreenExplorer({
  samples = JDW_SAMPLE_SCREENS,
  initialSampleId,
}: JdwSampleScreenExplorerProps) {
  const [sampleId, setSampleId] = useState(initialSampleId ?? samples[0]?.id ?? '');
  const activeSample = resolveSample(samples, sampleId);
  const [documentValue, setDocumentValue] = useState(() => formatJdwSampleScreenJson(activeSample));
  const assetCatalog = useMemo(() => createScreenSpecPaletteAssetCatalog(), []);

  const sampleOptions = useMemo(
    () =>
      samples.map((sample) => (
        <option key={sample.id} value={sample.id}>
          {sample.title}
        </option>
      )),
    [samples],
  );

  if (samples.length === 0) {
    return <div data-testid="jdw-sample-explorer-empty">No sample screens configured.</div>;
  }

  return (
    <WorkbenchAuthoringShell
      data-testid="jdw-sample-explorer"
      toolbar={
        <Field label="Load sample" htmlFor="jdw-sample-screen-select" inline>
          <Select
            id="jdw-sample-screen-select"
            aria-label="Load sample"
            data-testid="jdw-sample-screen-select"
            controlWidth="wide"
            value={activeSample.id}
            onValueChange={(nextId) => {
              const next = resolveSample(samples, nextId);
              setSampleId(next.id);
              setDocumentValue(formatJdwSampleScreenJson(next));
            }}
          >
            {sampleOptions}
          </Select>
        </Field>
      }
    >
      <WidgetTreeLab
        assetCatalog={assetCatalog}
        registry={BUILTIN_JDW_REGISTRY}
        value={documentValue}
        onChange={setDocumentValue}
      />
    </WorkbenchAuthoringShell>
  );
}
