import { useEffect, useState } from 'react';

import { compileScreenSpecText } from '@workbench-kit/jdw';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel.js';
import { WorkbenchParseError } from '../layout/WorkbenchPropertyPanel.js';
import { Field } from '../primitives/Field.js';
import { Select } from '../primitives/Select.js';
import { SegmentedControl } from '../primitives/WorkbenchEditor.js';
import { ScreenSpecEditor, useScreenSpecPipeline } from '@workbench-kit/jdw-editor';
import { SplitView } from '../workbench/SplitView.js';
import { JdwPreview } from '../jdw/JdwPreview.js';
import {
  formatJdwSampleScreenSpec,
  JDW_SAMPLE_SCREENS,
  type JdwSampleScreenDefinition,
} from './fixtures/jdw-sample-screens.js';

export type JdwSampleSourceView = 'editor' | 'jdw';

export interface JdwSampleScreenExplorerProps {
  readonly samples?: readonly JdwSampleScreenDefinition[] | undefined;
  readonly initialSampleId?: string | undefined;
  readonly initialSourceView?: JdwSampleSourceView | undefined;
}

function resolveSample(
  samples: readonly JdwSampleScreenDefinition[],
  sampleId: string,
): JdwSampleScreenDefinition {
  return samples.find((entry) => entry.id === sampleId) ?? samples[0]!;
}

const SOURCE_VIEW_OPTIONS = [
  { label: 'Screen editor', testId: 'jdw-sample-source-editor', value: 'editor' as const },
  { label: 'JDW JSON', testId: 'jdw-sample-source-jdw', value: 'jdw' as const },
];

export function JdwSampleScreenExplorer({
  samples = JDW_SAMPLE_SCREENS,
  initialSampleId,
  initialSourceView = 'editor',
}: JdwSampleScreenExplorerProps) {
  const [sampleId, setSampleId] = useState(initialSampleId ?? samples[0]?.id ?? '');
  const [sourceView, setSourceView] = useState<JdwSampleSourceView>(initialSourceView);
  const activeSample = resolveSample(samples, sampleId);
  const pipeline = useScreenSpecPipeline(activeSample);
  const { resetSpec } = pipeline;
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    resetSpec(resolveSample(samples, sampleId));
    setEditorError(null);
  }, [resetSpec, sampleId, samples]);

  if (samples.length === 0) {
    return <div data-testid="jdw-sample-explorer-empty">No sample screens configured.</div>;
  }

  const compileError = pipeline.compileError ?? editorError;

  const handleSourceViewChange = (nextView: JdwSampleSourceView) => {
    if (nextView === 'jdw') {
      const compiled = compileScreenSpecText(formatJdwSampleScreenSpec(pipeline.spec));
      if (compiled.json) {
        pipeline.setJson(compiled.json);
      }
    }
    setSourceView(nextView);
  };

  return (
    <div className="jdw-sample-explorer" data-testid="jdw-sample-explorer">
      <Panel className="jdw-sample-explorer__panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <PanelHeader
          actions={
            <div className="jdw-sample-explorer__header-actions">
              <SegmentedControl
                ariaLabel="Source view"
                options={SOURCE_VIEW_OPTIONS}
                value={sourceView}
                onChange={handleSourceViewChange}
              />
              <Field label="Sample screen" htmlFor="jdw-sample-screen-select" inline>
                <Select
                  id="jdw-sample-screen-select"
                  aria-label="Sample screen"
                  data-testid="jdw-sample-screen-select"
                  controlWidth="wide"
                  value={activeSample.id}
                  onValueChange={setSampleId}
                >
                  {samples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          }
        >
          JDW Sample Explorer
        </PanelHeader>
        <PanelBody
          className="jdw-sample-explorer__body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 0,
            flex: 1,
            paddingTop: 0,
          }}
        >
          <p className="jdw-sample-explorer__description">{activeSample.description}</p>
          {compileError ? (
            <WorkbenchParseError role="alert" data-testid="jdw-sample-explorer-error">
              {compileError}
            </WorkbenchParseError>
          ) : null}
          <SplitView
            className="jdw-sample-explorer__split"
            defaultPrimarySizePercent={46}
            minPrimarySizePercent={24}
            maxPrimarySizePercent={72}
            primary={
              <section
                aria-label={sourceView === 'editor' ? 'Screen spec editor' : 'JDW JSON source'}
                className="jdw-sample-explorer__pane"
                data-testid="jdw-sample-explorer-source-pane"
              >
                <header className="jdw-sample-explorer__pane-header">
                  {sourceView === 'editor' ? 'Screen editor' : 'JDW JSON'}
                </header>
                <div className="jdw-sample-explorer__pane-body">
                  {sourceView === 'editor' ? (
                    <ScreenSpecEditor
                      value={pipeline.spec}
                      onChange={pipeline.setSpec}
                      onCompileError={setEditorError}
                    />
                  ) : (
                    <textarea
                      aria-label="JDW JSON source"
                      className="jdw-sample-explorer__json-source"
                      data-testid="jdw-sample-explorer-json"
                      value={pipeline.json}
                      onChange={(event) => pipeline.setJson(event.target.value)}
                      spellCheck={false}
                    />
                  )}
                </div>
              </section>
            }
            secondary={
              <section
                aria-label="Rendered preview"
                className="jdw-sample-explorer__pane"
                data-testid="jdw-sample-explorer-preview-pane"
              >
                <header className="jdw-sample-explorer__pane-header">Preview</header>
                <div className="jdw-sample-explorer__pane-body">
                  <JdwPreview
                    json={pipeline.json}
                    layoutConstraints={pipeline.layoutConstraints}
                  />
                </div>
              </section>
            }
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
