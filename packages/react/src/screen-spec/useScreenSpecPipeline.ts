import { useCallback, useMemo, useState } from 'react';
import {
  compileScreenSpecToJson,
  type JdwScreenSpec,
  type LayoutConstraints,
} from '@workbench-kit/json-widget';

export interface ScreenSpecPipelineState {
  readonly spec: JdwScreenSpec;
  readonly json: string;
  readonly compileError: string | null;
  readonly layoutConstraints: LayoutConstraints;
}

export interface UseScreenSpecPipelineResult extends ScreenSpecPipelineState {
  readonly setSpec: (spec: JdwScreenSpec) => void;
  readonly setJson: (json: string) => void;
  readonly resetSpec: (spec: JdwScreenSpec) => void;
}

function layoutConstraintsFromSpec(spec: JdwScreenSpec): LayoutConstraints {
  return {
    minWidth: 0,
    maxWidth: spec.layout.maxWidth,
    minHeight: 0,
    maxHeight: spec.layout.maxHeight,
  };
}

function compileSpec(spec: JdwScreenSpec): { json: string; error: string | null } {
  try {
    return { json: compileScreenSpecToJson(spec), error: null };
  } catch (error) {
    return {
      json: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function useScreenSpecPipeline(initialSpec: JdwScreenSpec): UseScreenSpecPipelineResult {
  const initial = useMemo(() => {
    const compiled = compileSpec(initialSpec);
    return {
      spec: initialSpec,
      json: compiled.json,
      compileError: compiled.error,
      layoutConstraints: layoutConstraintsFromSpec(initialSpec),
    };
  }, [initialSpec]);

  const [spec, setSpecState] = useState(initial.spec);
  const [json, setJsonState] = useState(initial.json);
  const [compileError, setCompileError] = useState<string | null>(initial.compileError);
  const [layoutConstraints, setLayoutConstraints] = useState(initial.layoutConstraints);

  const setSpec = useCallback((nextSpec: JdwScreenSpec) => {
    const compiled = compileSpec(nextSpec);
    setSpecState(nextSpec);
    setLayoutConstraints(layoutConstraintsFromSpec(nextSpec));
    setCompileError(compiled.error);
    if (compiled.error === null) {
      setJsonState(compiled.json);
    }
  }, []);

  const resetSpec = useCallback((nextSpec: JdwScreenSpec) => {
    setSpec(nextSpec);
  }, [setSpec]);

  const setJson = useCallback((nextJson: string) => {
    setJsonState(nextJson);
    setCompileError(null);
  }, []);

  return {
    spec,
    json,
    compileError,
    layoutConstraints,
    setSpec,
    setJson,
    resetSpec,
  };
}
