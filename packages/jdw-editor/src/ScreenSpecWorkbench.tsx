import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatScreenSpecJson,
  parseScreenSpecJson,
  screenNodePathToWidgetPath,
  widgetPathToScreenNodePath,
  type JdwScreenSpec,
  type ScreenNodePath,
  type WidgetPath,
} from '@workbench-kit/jdw';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';
import { JdwPreviewViewport } from '@workbench-kit/react/jdw/preview-viewport';
import {
  WorkbenchAuthoringShell,
  WorkbenchLabeledPane,
  WorkbenchParseError,
  WorkbenchSurfaceMeta,
} from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/shell';

import { ScreenSpecEditor } from './ScreenSpecEditor.js';
import { useScreenSpecPipeline } from './useScreenSpecPipeline.js';

/** @deprecated Compile Screen Spec templates once, then author the JDW result with `WidgetTreeLab`. */
export interface ScreenSpecWorkbenchProps {
  readonly value: string;
  readonly onChange?: ((next: string) => void) | undefined;
  readonly className?: string | undefined;
}

const INVALID_SCREEN_FALLBACK: JdwScreenSpec = {
  id: 'invalid-screen',
  title: 'Invalid screen spec',
  description: '',
  frameWidth: 360,
  layout: { maxWidth: 360, maxHeight: 240 },
  root: { kind: 'text', content: '' },
};

const PREVIEW_HELP = 'Click to select · Middle-drag to pan · Ctrl+Scroll to zoom';

/**
 * Compatibility-only 3-pane Screen Spec authoring.
 *
 * @deprecated Compile Screen Spec templates once, then author the resulting JDW
 * document with `WidgetTreeLab`. ScreenNodePath↔WidgetPath synchronization stays
 * here only for compatibility and must not be used by active product entries.
 */
export function ScreenSpecWorkbench({ value, onChange, className }: ScreenSpecWorkbenchProps) {
  const parsed = useMemo(() => parseScreenSpecJson(value), [value]);
  const pipeline = useScreenSpecPipeline(parsed.value ?? INVALID_SCREEN_FALLBACK);
  const { resetSpec, setSpec, spec, json, compileError } = pipeline;
  const [selectedPath, setSelectedPath] = useState<ScreenNodePath>([]);
  /** Skips document→pipeline echo after local writes (avoids recompile + selection reset). */
  const lastWrittenValueRef = useRef<string | null>(null);
  /** Mount seed — avoids an immediate resetSpec/compile for the same document. */
  const seededSpecRef = useRef(parsed.value);

  useEffect(() => {
    if (lastWrittenValueRef.current === value) {
      return;
    }
    lastWrittenValueRef.current = null;
    if (parsed.value) {
      if (parsed.value !== seededSpecRef.current) {
        resetSpec(parsed.value);
        setSelectedPath([]);
      }
      seededSpecRef.current = parsed.value;
    }
  }, [parsed.value, resetSpec, value]);

  const selectedWidgetPath = useMemo(() => {
    if (!parsed.value) {
      return null;
    }
    return screenNodePathToWidgetPath(spec.root, selectedPath);
  }, [parsed.value, selectedPath, spec.root]);

  const handleSpecChange = useCallback(
    (nextSpec: JdwScreenSpec) => {
      const nextValue = formatScreenSpecJson(nextSpec);
      lastWrittenValueRef.current = nextValue;
      setSpec(nextSpec);
      onChange?.(nextValue);
    },
    [onChange, setSpec],
  );

  const handleSelectWidgetPath = useCallback(
    (widgetPath: WidgetPath) => {
      const nextPath = widgetPathToScreenNodePath(spec.root, widgetPath);
      if (nextPath) {
        setSelectedPath(nextPath);
      }
    },
    [spec.root],
  );

  if (!parsed.value) {
    return (
      <WorkbenchAuthoringShell className={className} data-testid="screen-spec-workbench">
        <WorkbenchParseError role="alert" data-testid="screen-spec-workbench-error">
          {parsed.error ?? 'Invalid screen spec document.'}
        </WorkbenchParseError>
      </WorkbenchAuthoringShell>
    );
  }

  return (
    <WorkbenchAuthoringShell
      className={className}
      data-testid="screen-spec-workbench"
      toolbar={
        spec.title ? (
          <WorkbenchSurfaceMeta>
            {spec.title}
            {spec.description ? ` — ${spec.description}` : ''}
          </WorkbenchSurfaceMeta>
        ) : null
      }
    >
      {compileError ? (
        <WorkbenchParseError role="alert" data-testid="screen-spec-workbench-error">
          {compileError}
        </WorkbenchParseError>
      ) : null}
      <SplitView
        defaultPrimarySizePercent={22}
        minPrimarySizePercent={16}
        maxPrimarySizePercent={36}
        primary={
          <ScreenSpecEditor
            pane="outline"
            selectedPath={selectedPath}
            value={spec}
            onChange={handleSpecChange}
            onSelectPath={setSelectedPath}
          />
        }
        secondary={
          <SplitView
            defaultPrimarySizePercent={64}
            minPrimarySizePercent={40}
            maxPrimarySizePercent={78}
            primary={
              <WorkbenchLabeledPane
                aria-label="Rendered preview"
                chrome="flat"
                data-testid="screen-spec-workbench-preview-pane"
                title="Preview"
              >
                <JdwPreviewViewport
                  enablePrimaryPointerPan={false}
                  help={PREVIEW_HELP}
                  json={json}
                  registry={BUILTIN_JDW_REGISTRY}
                  selectedPath={selectedWidgetPath}
                  onSelectPath={handleSelectWidgetPath}
                />
              </WorkbenchLabeledPane>
            }
            secondary={
              <ScreenSpecEditor
                pane="inspector"
                selectedPath={selectedPath}
                value={spec}
                onChange={handleSpecChange}
                onSelectPath={setSelectedPath}
              />
            }
          />
        }
      />
    </WorkbenchAuthoringShell>
  );
}
