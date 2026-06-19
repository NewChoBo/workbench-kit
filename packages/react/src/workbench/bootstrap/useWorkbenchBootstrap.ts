import { useCallback, useRef, useState } from 'react';

export type WorkbenchBootstrapTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkbenchBootstrapTaskDefinition {
  detail?: string | undefined;
  id: string;
  label: string;
  run: () => Promise<void>;
}

export interface WorkbenchBootstrapTaskViewModel {
  detail?: string | undefined;
  error?: string | undefined;
  id: string;
  label: string;
  status: WorkbenchBootstrapTaskStatus;
}

export type WorkbenchBootstrapRunStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface WorkbenchBootstrapController {
  currentTaskId: string | undefined;
  error: string | undefined;
  isReady: boolean;
  retry: () => void;
  run: (tasks: readonly WorkbenchBootstrapTaskDefinition[]) => Promise<void>;
  status: WorkbenchBootstrapRunStatus;
  tasks: readonly WorkbenchBootstrapTaskViewModel[];
}

function toPendingTasks(
  definitions: readonly WorkbenchBootstrapTaskDefinition[],
): WorkbenchBootstrapTaskViewModel[] {
  return definitions.map((definition) => ({
    detail: definition.detail,
    id: definition.id,
    label: definition.label,
    status: 'pending',
  }));
}

function updateTaskStatus(
  tasks: readonly WorkbenchBootstrapTaskViewModel[],
  taskId: string,
  patch: Partial<WorkbenchBootstrapTaskViewModel>,
): WorkbenchBootstrapTaskViewModel[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task));
}

export function useWorkbenchBootstrap(): WorkbenchBootstrapController {
  const [status, setStatus] = useState<WorkbenchBootstrapRunStatus>('idle');
  const [tasks, setTasks] = useState<readonly WorkbenchBootstrapTaskViewModel[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const lastDefinitionsRef = useRef<readonly WorkbenchBootstrapTaskDefinition[]>([]);
  const runGenerationRef = useRef(0);

  const run = useCallback(async (definitions: readonly WorkbenchBootstrapTaskDefinition[]) => {
    const generation = ++runGenerationRef.current;
    lastDefinitionsRef.current = definitions;
    setStatus('running');
    setError(undefined);
    setTasks(toPendingTasks(definitions));

    for (const definition of definitions) {
      if (generation !== runGenerationRef.current) {
        return;
      }

      setCurrentTaskId(definition.id);
      setTasks((currentTasks) =>
        updateTaskStatus(currentTasks, definition.id, { status: 'running' }),
      );

      try {
        await definition.run();
      } catch (cause) {
        if (generation !== runGenerationRef.current) {
          return;
        }

        const message = cause instanceof Error ? cause.message : 'Startup failed.';
        setTasks((currentTasks) =>
          updateTaskStatus(currentTasks, definition.id, {
            error: message,
            status: 'failed',
          }),
        );
        setStatus('failed');
        setError(message);
        setCurrentTaskId(undefined);
        return;
      }

      if (generation !== runGenerationRef.current) {
        return;
      }

      setTasks((currentTasks) =>
        updateTaskStatus(currentTasks, definition.id, { status: 'completed' }),
      );
    }

    if (generation !== runGenerationRef.current) {
      return;
    }

    setCurrentTaskId(undefined);
    setStatus('completed');
  }, []);

  const retry = useCallback(() => {
    if (lastDefinitionsRef.current.length === 0) {
      return;
    }

    void run(lastDefinitionsRef.current);
  }, [run]);

  return {
    currentTaskId,
    error,
    isReady: status === 'completed',
    retry,
    run,
    status,
    tasks,
  };
}
