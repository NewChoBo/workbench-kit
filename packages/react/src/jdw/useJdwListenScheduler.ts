import { useEffect, useRef, useState } from 'react';
import {
  createJsonWidgetListenScheduler,
  type JsonWidgetListenSchedule,
  type JsonWidgetListenScheduler,
  type JsonWidgetListenSchedulerBatch,
  type JsonWidgetNode,
} from '@workbench-kit/jdw';

export interface UseJdwListenSchedulerOptions {
  readonly root: JsonWidgetNode | null;
  readonly changedPaths: readonly string[];
  /** Increment for each accepted change event, including repeated paths. */
  readonly changeVersion: number;
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
  changeVersion,
  schedule,
}: UseJdwListenSchedulerOptions): JsonWidgetListenSchedulerBatch | null {
  const rootRef = useRef(root);
  rootRef.current = root;
  const changedPathsRef = useRef(changedPaths);
  changedPathsRef.current = changedPaths;
  const scheduleRef = useRef(schedule ?? schedulePreviewFrame);
  scheduleRef.current = schedule ?? schedulePreviewFrame;
  const schedulerRef = useRef<JsonWidgetListenScheduler | null>(null);
  const [batch, setBatch] = useState<JsonWidgetListenSchedulerBatch | null>(null);

  useEffect(() => {
    const scheduler = createJsonWidgetListenScheduler({
      getRoot: () => rootRef.current,
      schedule: (flush) => scheduleRef.current(flush),
    });
    schedulerRef.current = scheduler;
    const unsubscribe = scheduler.subscribe(setBatch);
    return () => {
      if (schedulerRef.current === scheduler) {
        schedulerRef.current = null;
      }
      unsubscribe();
      scheduler.dispose();
    };
  }, []);

  useEffect(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) {
      return;
    }
    for (const path of changedPathsRef.current) {
      scheduler.notify(path);
    }
  }, [changeVersion]);

  return batch;
}
