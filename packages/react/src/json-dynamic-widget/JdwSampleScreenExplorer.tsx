import { useEffect, useState } from 'react';

import { compileScreenSpecText, type JdwScreenSpec } from '@workbench-kit/json-widget';

import { Panel, PanelBody, PanelHeader } from '../layout/Panel.js';
import { Button } from '../primitives/Button.js';
import { Field } from '../primitives/Field.js';
import { SplitView } from '../workbench/SplitView.js';
import { JsonWidgetPreview } from '../json-widget/JsonWidgetPreview.js';
import {
  formatJdwSampleScreenJson,
  formatJdwSampleScreenSpec,
  JDW_SAMPLE_SCREENS,
  sampleLayoutConstraints,
  type JdwSampleScreenDefinition,
} from './fixtures/jdw-sample-screens.js';

export type JdwSampleSourceView = 'spec' | 'jdw';

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

export function JdwSampleScreenExplorer({
  samples = JDW_SAMPLE_SCREENS,
  initialSampleId,
  initialSourceView = 'spec',
}: JdwSampleScreenExplorerProps) {
  const [sampleId, setSampleId] = useState(initialSampleId ?? samples[0]?.id ?? '');
  const [sourceView, setSourceView] = useState<JdwSampleSourceView>(initialSourceView);
  const [activeSample, setActiveSample] = useState<JdwSampleScreenDefinition>(() =>
    resolveSample(samples, sampleId),
  );
  const [specText, setSpecText] = useState(() => formatJdwSampleScreenSpec(activeSample));
  const [json, setJson] = useState(() => formatJdwSampleScreenJson(activeSample));
  const [previewSpec, setPreviewSpec] = useState<JdwScreenSpec>(activeSample);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    const nextSample = resolveSample(samples, sampleId);
    setActiveSample(nextSample);
    setSpecText(formatJdwSampleScreenSpec(nextSample));
    setJson(formatJdwSampleScreenJson(nextSample));
    setPreviewSpec(nextSample);
    setCompileError(null);
  }, [sampleId, samples]);

  const applyCompiledSpec = (source: string) => {
    const compiled = compileScreenSpecText(source);
    if (compiled.error !== null || compiled.json === null || compiled.spec === null) {
      setCompileError(compiled.error ?? 'Invalid screen spec.');
      return false;
    }

    setCompileError(null);
    setPreviewSpec(compiled.spec);
    setJson(compiled.json);
    return true;
  };

  const handleSpecChange = (nextSpecText: string) => {
    setSpecText(nextSpecText);
    applyCompiledSpec(nextSpecText);
  };

  const showJdwSource = () => {
    applyCompiledSpec(specText);
    setSourceView('jdw');
  };

  if (samples.length === 0) {
    return <div data-testid="jdw-sample-explorer-empty">No sample screens configured.</div>;
  }

  const leftPaneValue = sourceView === 'spec' ? specText : json;

  return (
    <div
      className="jdw-sample-explorer"
      data-testid="jdw-sample-explorer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 640,
        height: '100%',
      }}
    >
      <Panel style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <PanelHeader
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }} role="tablist" aria-label="Source view">
                <Button
                  aria-pressed={sourceView === 'spec'}
                  data-testid="jdw-sample-source-spec"
                  role="tab"
                  variant={sourceView === 'spec' ? 'primary' : 'default'}
                  onClick={() => setSourceView('spec')}
                >
                  Screen spec
                </Button>
                <Button
                  aria-pressed={sourceView === 'jdw'}
                  data-testid="jdw-sample-source-jdw"
                  role="tab"
                  variant={sourceView === 'jdw' ? 'primary' : 'default'}
                  onClick={showJdwSource}
                >
                  JDW JSON
                </Button>
              </div>
              <Field label="Sample screen" htmlFor="jdw-sample-screen-select" inline>
                <select
                  id="jdw-sample-screen-select"
                  aria-label="Sample screen"
                  data-testid="jdw-sample-screen-select"
                  value={activeSample.id}
                  onChange={(event) => setSampleId(event.target.value)}
                  style={{
                    minWidth: 220,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #3c4043',
                    background: '#1e2127',
                    color: '#e8eaed',
                  }}
                >
                  {samples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          }
        >
          JDW Sample Explorer
        </PanelHeader>
        <PanelBody
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 0,
            flex: 1,
            paddingTop: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: '#9aa0a6',
            }}
          >
            {activeSample.description}
          </p>
          {compileError ? (
            <div
              role="alert"
              data-testid="jdw-sample-explorer-error"
              style={{
                margin: 0,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #8b3a3a',
                background: '#2a1515',
                color: '#f28b82',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {compileError}
            </div>
          ) : null}
          <SplitView
            className="jdw-sample-explorer__split"
            defaultPrimarySizePercent={46}
            minPrimarySizePercent={24}
            maxPrimarySizePercent={72}
            primary={
              <section
                aria-label={sourceView === 'spec' ? 'Screen spec source' : 'JDW JSON source'}
                data-testid="jdw-sample-explorer-json-pane"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  height: '100%',
                  border: '1px solid #3c4043',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#0d0f12',
                }}
              >
                <header
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #2b2f36',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#c4c7c5',
                  }}
                >
                  {sourceView === 'spec' ? 'Screen spec' : 'JDW JSON'}
                </header>
                <textarea
                  aria-label={sourceView === 'spec' ? 'Screen spec source' : 'JDW JSON source'}
                  data-testid="jdw-sample-explorer-json"
                  value={leftPaneValue}
                  onChange={(event) => {
                    if (sourceView === 'spec') {
                      handleSpecChange(event.target.value);
                      return;
                    }
                    setJson(event.target.value);
                    setCompileError(null);
                  }}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    width: '100%',
                    minHeight: 420,
                    resize: 'none',
                    border: 0,
                    outline: 'none',
                    padding: 12,
                    background: 'transparent',
                    color: '#e8eaed',
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: 12,
                    lineHeight: 1.5,
                    tabSize: 2,
                  }}
                />
              </section>
            }
            secondary={
              <section
                aria-label="Rendered preview"
                data-testid="jdw-sample-explorer-preview-pane"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  height: '100%',
                  border: '1px solid #3c4043',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#0d0f12',
                }}
              >
                <header
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #2b2f36',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#c4c7c5',
                  }}
                >
                  Preview
                </header>
                <div
                  style={{
                    flex: 1,
                    minHeight: 420,
                    overflow: 'auto',
                    padding: 12,
                  }}
                >
                  <JsonWidgetPreview
                    json={json}
                    layoutConstraints={sampleLayoutConstraints(previewSpec)}
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
