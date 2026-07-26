import { useEffect, useRef, useState, type JSX } from 'react';
import { Button } from '@workbench-kit/react/primitives';

import type { FieldRemapFlowActions } from './flow.js';
import { FieldRemapPanel } from './panel.js';
import { getFieldRemapSample, type FieldRemapSampleId } from './samples.js';

export interface SampleFieldRemapDemoProps {
  readonly sampleId?: FieldRemapSampleId | string | undefined;
  /** Forwarded to Flow mapper (default true). */
  readonly showMinimap?: boolean | undefined;
  /** When true, show host-chrome demo controls (minimap toggle + fit view). */
  readonly showHostChromeDemo?: boolean | undefined;
}

/**
 * Sample host wrapper around {@link FieldRemapPanel}.
 */
export function SampleFieldRemapDemo({
  sampleId = 'nested-ab',
  showMinimap: showMinimapProp,
  showHostChromeDemo = false,
}: SampleFieldRemapDemoProps = {}): JSX.Element {
  const sample = getFieldRemapSample(sampleId);
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
            data-testid="field-remap-toggle-minimap"
            onClick={() => setShowMinimap((current) => !current)}
          >
            {showMinimap ? 'Hide MiniMap' : 'Show MiniMap'}
          </Button>
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
        key={sample.id}
        sample={sample}
        showMinimap={showMinimap}
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
