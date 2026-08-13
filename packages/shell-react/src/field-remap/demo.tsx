import { useEffect, useRef, useState, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';

import type { FieldRemapChromeLabels, FieldRemapTranslate } from './chrome-labels.js';
import type { FieldRemapFlowActions, FieldRemapFlowMapperProps } from './flow.js';
import type { FieldRemapIoChrome } from './io-class-browse.js';
import { FieldRemapPanel } from './panel.js';
import {
  getFieldRemapBrowseDemoShapes,
  getFieldRemapSample,
  type FieldRemapSampleId,
} from './samples.js';

export interface SampleFieldRemapDemoProps {
  readonly sampleId?: FieldRemapSampleId | string | undefined;
  /** Forwarded to Flow mapper (default true). */
  readonly showMinimap?: boolean | undefined;
  /** Forwarded Flow chrome preset. */
  readonly chrome?: FieldRemapFlowMapperProps['chrome'];
  readonly showFlowHint?: FieldRemapFlowMapperProps['showFlowHint'];
  readonly showBindingsList?: FieldRemapFlowMapperProps['showBindingsList'];
  readonly showConvertPalette?: FieldRemapFlowMapperProps['showConvertPalette'];
  /** When true, show host-chrome demo controls (minimap toggle + fit view). */
  readonly showHostChromeDemo?: boolean | undefined;
  /** Prefer `browse` for I/O class/field inspection demos. */
  readonly ioChrome?: FieldRemapIoChrome | undefined;
  /** When true with `ioChrome: 'browse'`, seed classRef + hidden leaf shapes. */
  readonly browseSeedShapes?: boolean | undefined;
  readonly labels?: Partial<FieldRemapChromeLabels> | undefined;
  readonly t?: FieldRemapTranslate | undefined;
}

/**
 * Sample host wrapper around {@link FieldRemapPanel}.
 */
export function SampleFieldRemapDemo({
  sampleId = 'nested-ab',
  showMinimap: showMinimapProp,
  chrome,
  showFlowHint,
  showBindingsList,
  showConvertPalette,
  showHostChromeDemo = false,
  ioChrome,
  browseSeedShapes = false,
  labels,
  t,
}: SampleFieldRemapDemoProps = {}): JSX.Element {
  const sample = getFieldRemapSample(sampleId);
  const browseShapes = browseSeedShapes ? getFieldRemapBrowseDemoShapes() : null;
  const flowActionsRef = useRef<FieldRemapFlowActions | null>(null);
  const [showMinimap, setShowMinimap] = useState(showMinimapProp ?? true);
  const [lastPaneMenu, setLastPaneMenu] = useState<string | null>(null);

  useEffect(() => {
    if (showMinimapProp !== undefined) {
      setShowMinimap(showMinimapProp);
    }
  }, [showMinimapProp]);

  return (
    <div data-testid="field-remap-demo-host">
      {showHostChromeDemo ? (
        <div
          className="workbench-field-remap-demo__host-chrome"
          data-testid="field-remap-host-chrome"
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}
        >
          <Button
            compact
            type="button"
            data-testid="field-remap-fit-view"
            onClick={() => flowActionsRef.current?.fitView()}
          >
            Fit view
          </Button>
          {lastPaneMenu ? (
            <span data-testid="field-remap-pane-menu-log" role="status">
              Pane menu: {lastPaneMenu}
            </span>
          ) : null}
        </div>
      ) : null}
      <FieldRemapPanel
        key={`${sample.id}:${ioChrome ?? 'default'}:${browseSeedShapes ? 'seed' : 'plain'}`}
        sample={sample}
        showMinimap={showMinimap}
        chrome={chrome}
        showFlowHint={showFlowHint}
        showBindingsList={showBindingsList}
        showConvertPalette={showConvertPalette}
        onShowMinimapChange={setShowMinimap}
        ioChrome={ioChrome}
        editableShapes={ioChrome === 'browse' ? false : undefined}
        sources={browseShapes?.sources}
        targets={browseShapes?.targets}
        labels={labels}
        t={t}
        flowActionsRef={showHostChromeDemo ? flowActionsRef : undefined}
        onPaneContextMenu={
          showHostChromeDemo
            ? (event) => {
                event.preventDefault();
                setLastPaneMenu(new Date().toISOString());
              }
            : undefined
        }
      />
    </div>
  );
}
