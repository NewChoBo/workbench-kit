import { useCallback, useState } from 'react';
import {
  compileScreenSpecToJson,
  type JdwScreenSpec,
  type LayoutConstraints,
} from '@workbench-kit/jdw';

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

function createPipelineState(spec: JdwScreenSpec): ScreenSpecPipelineState {
  const compiled = compileSpec(spec);
  return {
    spec,
    json: compiled.json,
    compileError: compiled.error,
    layoutConstraints: layoutConstraintsFromSpec(spec),
  };
}

/**
 * Owns Screen Spec → compiled JDW JSON. Compiles once per `setSpec`/`resetSpec`.
 * `initialSpec` is mount-only; external document reloads must call `resetSpec`.
 */
export function useScreenSpecPipeline(initialSpec: JdwScreenSpec): UseScreenSpecPipelineResult {
  const [state, setState] = useState(() => createPipelineState(initialSpec));

  const setSpec = useCallback((nextSpec: JdwScreenSpec) => {
    const compiled = compileSpec(nextSpec);
    setState((prev) => ({
      spec: nextSpec,
      layoutConstraints: layoutConstraintsFromSpec(nextSpec),
      compileError: compiled.error,
      json: compiled.error === null ? compiled.json : prev.json,
    }));
  }, []);

  const setJson = useCallback((nextJson: string) => {
    setState((prev) => ({
      ...prev,
      json: nextJson,
      compileError: null,
    }));
  }, []);

  return {
    ...state,
    setSpec,
    setJson,
    resetSpec: setSpec,
  };
}
