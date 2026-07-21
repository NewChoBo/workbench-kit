import { type ReactNode, useState } from 'react';
import {
  screenColumn,
  screenText,
  type JdwScreenSpec,
  type ScreenNodePath,
} from '@workbench-kit/jdw';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';
import { JdwPreview } from '@workbench-kit/react/jdw/preview';
import {
  WorkbenchFill,
  WorkbenchLabeledPane,
  WorkbenchParseError,
} from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/shell';

import { ScreenSpecEditor } from './ScreenSpecEditor.js';
import { useScreenSpecPipeline } from './useScreenSpecPipeline.js';

const DEMO_SCREEN_SPEC: JdwScreenSpec = {
  id: 'demo-screen',
  title: 'Demo Screen',
  description: 'Screen-spec compile smoke sample',
  frameWidth: 360,
  layout: { maxWidth: 360, maxHeight: 240 },
  root: screenColumn([screenText('Hello from ScreenSpec')], { gap: 8, padding: 12 }),
};

export interface ScreenSpecEditorStoryHostProps {
  readonly initialSpec?: JdwScreenSpec | undefined;
  readonly previewLabel?: ReactNode | undefined;
}

/**
 * Compatibility smoke shell: Outline | Preview | Inspector.
 *
 * @deprecated Active stories compile templates into JDW and open
 * `WidgetTreeLab`. Keep this host only for compatibility editor tests.
 */
export function ScreenSpecEditorStoryHost({
  initialSpec = DEMO_SCREEN_SPEC,
  previewLabel = 'Compiled preview',
}: ScreenSpecEditorStoryHostProps) {
  const pipeline = useScreenSpecPipeline(initialSpec);
  const [selectedPath, setSelectedPath] = useState<ScreenNodePath>([]);

  const previewPane = (
    <WorkbenchLabeledPane
      aria-label="Compiled JDW preview"
      chrome="flat"
      data-testid="jdw-screen-spec-story-preview"
      title={previewLabel}
    >
      {pipeline.compileError ? (
        <WorkbenchParseError role="alert" data-testid="jdw-screen-spec-story-error">
          {pipeline.compileError}
        </WorkbenchParseError>
      ) : (
        <JdwPreview json={pipeline.json} registry={BUILTIN_JDW_REGISTRY} />
      )}
    </WorkbenchLabeledPane>
  );

  return (
    <WorkbenchFill
      className="jdw-screen-spec-story-host"
      data-testid="jdw-screen-spec-story-host"
      style={{ minHeight: 360, padding: 12 }}
    >
      <SplitView
        defaultPrimarySizePercent={22}
        minPrimarySizePercent={16}
        maxPrimarySizePercent={36}
        primary={
          <ScreenSpecEditor
            pane="outline"
            selectedPath={selectedPath}
            value={pipeline.spec}
            onChange={pipeline.setSpec}
            onSelectPath={setSelectedPath}
          />
        }
        secondary={
          <SplitView
            defaultPrimarySizePercent={64}
            minPrimarySizePercent={40}
            maxPrimarySizePercent={78}
            primary={previewPane}
            secondary={
              <ScreenSpecEditor
                pane="inspector"
                selectedPath={selectedPath}
                value={pipeline.spec}
                onChange={pipeline.setSpec}
                onSelectPath={setSelectedPath}
              />
            }
          />
        }
      />
    </WorkbenchFill>
  );
}
