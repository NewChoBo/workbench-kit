import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createJsonWidgetListenScheduler,
  type JsonWidgetListenSchedule,
  type JsonWidgetListenSchedulerBatch,
  type JsonWidgetNode,
} from '@workbench-kit/jdw';

export interface UseJdwListenSchedulerOptions {
  readonly root: JsonWidgetNode | null;
  readonly changedPaths: readonly string[];
  readonly schedule?: JsonWidgetListenSchedule;
}

const schedulePreviewFrame: JsonWidgetListenSchedule = (flush) => {
  if (typeof requestAnimationFrame === 'function') {
    const frame = requestAnimationFrame(() => flush());
    return () => cancelAnimationFrame(frame);
  }

  let active = true;
  queueMicrotask(() => {
    if (active) {
      flush();
    }
  });
  return () => {
    active = false;
  };
};

/** Subscribe React preview integrations to one coalesced JDW listen batch per frame. */
export function useJdwListenScheduler({
  root,
  changedPaths,
  schedule,
}: UseJdwListenSchedulerOptions): JsonWidgetListenSchedulerBatch | null {
  const rootRef = useRef(root);
  rootRef.current = root;
  const [batch, setBatch] = useState<JsonWidgetListenSchedulerBatch | null>(null);
  const effectiveSchedule = schedule ?? schedulePreviewFrame;
  const scheduler = useMemo(
    () =>
      createJsonWidgetListenScheduler({
        getRoot: () => rootRef.current,
        schedule: effectiveSchedule,
      }),
    [effectiveSchedule],
  );
  const changedPathsKey = JSON.stringify(changedPaths);
  const changedPathsSnapshotRef = useRef<{
    readonly key: string;
    readonly paths: readonly string[];
  }>({ key: '', paths: [] });
  if (changedPathsSnapshotRef.current.key !== changedPathsKey) {
    changedPathsSnapshotRef.current = { key: changedPathsKey, paths: [...changedPaths] };
  }
  const stableChangedPaths = changedPathsSnapshotRef.current.paths;

  useEffect(() => {
    const unsubscribe = scheduler.subscribe(setBatch);
    return () => {
      unsubscribe();
      scheduler.dispose();
    };
  }, [scheduler]);

  useEffect(() => {
    for (const path of stableChangedPaths) {
      scheduler.notify(path);
    }
  }, [scheduler, stableChangedPaths]);

  return batch;
}
