import { describe, expect, it, vi } from 'vitest';

import {
  createJsonWidgetListenScheduler,
  createJsonWidgetValueWarehouse,
  resolveJsonWidgetValues,
  type JsonWidgetListenSchedule,
  type JsonWidgetListenSchedulerBatch,
  type JsonWidgetNode,
} from '../index.js';

interface ScheduledTask {
  cancelled: boolean;
  readonly flush: () => void;
}

function createManualSchedule() {
  const tasks: ScheduledTask[] = [];
  const schedule: JsonWidgetListenSchedule = (flush) => {
    const task = { cancelled: false, flush };
    tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  };

  const run = (index = 0) => {
    const task = tasks[index];
    if (task && !task.cancelled) {
      task.flush();
    }
  };

  return { run, schedule, tasks };
}

function createListenRoot(): JsonWidgetNode {
  return {
    type: 'column',
    listen: ['theme'],
    args: {
      children: [
        {
          type: 'text',
          listen: ['title', 'theme.color', 'items.0.name'],
          args: { text: '${title}' },
        },
      ],
    },
  };
}

describe('createJsonWidgetListenScheduler', () => {
  it('dedupes valid burst paths and delivers one immutable scheduled batch', () => {
    const manual = createManualSchedule();
    const listener = vi.fn<(batch: JsonWidgetListenSchedulerBatch) => void>();
    const scheduler = createJsonWidgetListenScheduler({
      getRoot: createListenRoot,
      schedule: manual.schedule,
    });
    scheduler.subscribe(listener);

    expect(scheduler.notify('title')).toBe(true);
    expect(scheduler.notify('theme.color')).toBe(true);
    expect(scheduler.notify('title')).toBe(true);
    expect(manual.tasks).toHaveLength(1);

    manual.run();

    expect(listener).toHaveBeenCalledTimes(1);
    const batch = listener.mock.calls[0]![0];
    expect(batch.changedPaths).toEqual(['title', 'theme.color']);
    expect(batch.invalidations.map((entry) => entry.nodePath)).toEqual([
      'root',
      'root.args.children[0]',
    ]);
    expect(Object.isFrozen(batch)).toBe(true);
    expect(Object.isFrozen(batch.changedPaths)).toBe(true);
    expect(Object.isFrozen(batch.invalidations)).toBe(true);
    expect(batch.invalidations.every(Object.isFrozen)).toBe(true);
  });

  it('preserves parent-child matching without normalizing pending identities', () => {
    const scheduler = createJsonWidgetListenScheduler({ getRoot: createListenRoot });

    scheduler.notify('theme');
    const parentBatch = scheduler.flush();
    expect(parentBatch?.changedPaths).toEqual(['theme']);
    expect(parentBatch?.invalidations.map((entry) => entry.nodePath)).toEqual([
      'root',
      'root.args.children[0]',
    ]);

    scheduler.notify('theme.color');
    const childBatch = scheduler.flush();
    expect(childBatch?.changedPaths).toEqual(['theme.color']);
    expect(childBatch?.invalidations.map((entry) => entry.nodePath)).toEqual([
      'root',
      'root.args.children[0]',
    ]);
  });

  it('shares items.0.name identity with warehouse writes, resolution, and listen matching', () => {
    const root: JsonWidgetNode = {
      type: 'text',
      listen: ['items.0.name'],
      args: { text: '${items.0.name}' },
    };
    const warehouse = createJsonWidgetValueWarehouse({
      initialValues: { items: [{ name: 'First' }] },
    });
    const scheduler = createJsonWidgetListenScheduler({ getRoot: () => root });

    warehouse.setValue('items.0.name', 'Second');
    for (const path of warehouse.pendingChangedPaths()) {
      scheduler.notify(path);
    }

    const batch = scheduler.flush();
    expect(batch?.changedPaths).toEqual(['items.0.name']);
    expect(batch?.invalidations).toMatchObject([
      { changedListen: ['items.0.name'], nodePath: 'root' },
    ]);
    expect(resolveJsonWidgetValues(root, warehouse.getValues()).args.text).toBe('Second');
  });

  it('ignores malformed paths without creating a scheduled task', () => {
    const manual = createManualSchedule();
    const scheduler = createJsonWidgetListenScheduler({
      getRoot: createListenRoot,
      schedule: manual.schedule,
    });

    expect(scheduler.notify('')).toBe(false);
    expect(scheduler.notify(' theme.color')).toBe(false);
    expect(scheduler.notify('theme..color')).toBe(false);
    expect(manual.tasks).toHaveLength(0);
    expect(scheduler.flush()).toBeNull();
  });

  it('resolves the latest root at flush time', () => {
    const manual = createManualSchedule();
    let root = createListenRoot();
    const listener = vi.fn();
    const scheduler = createJsonWidgetListenScheduler({
      getRoot: () => root,
      schedule: manual.schedule,
    });
    scheduler.subscribe(listener);

    scheduler.notify('title');
    root = { type: 'text', listen: ['other'], args: { text: 'Replacement' } };
    manual.run();

    expect(listener).toHaveBeenCalledWith({ changedPaths: ['title'], invalidations: [] });
  });

  it('manual flush cancels pending delivery and unsubscribe/dispose prevent later delivery', () => {
    const manual = createManualSchedule();
    const listener = vi.fn();
    const scheduler = createJsonWidgetListenScheduler({
      getRoot: createListenRoot,
      schedule: manual.schedule,
    });
    const unsubscribe = scheduler.subscribe(listener);

    scheduler.notify('title');
    expect(scheduler.flush()?.changedPaths).toEqual(['title']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(manual.tasks[0]?.cancelled).toBe(true);
    manual.run();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    scheduler.notify('theme.color');
    manual.run(1);
    expect(listener).toHaveBeenCalledTimes(1);

    scheduler.notify('title');
    scheduler.dispose();
    manual.run(2);
    expect(scheduler.notify('title')).toBe(false);
    expect(scheduler.flush()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
