import type { CommandDefinition, KeybindingDefinition } from '@workbench-kit/platform';
import type {
  ConfigurationContribution,
  MenuContribution,
  PanelContribution,
  StatusBarContribution,
  ViewContainerContribution,
  ViewContribution,
} from '@workbench-kit/workbench-extension-sdk';

import type {
  WorkbenchViewContainerContribution,
  WorkbenchViewContribution,
} from '../contributions/registries.js';
import { isRecord } from './is-record.js';

export function toCommandDefinition(command: {
  category?: string;
  command: string;
  enablement?: string;
  icon?: string;
  title: string;
}): CommandDefinition {
  return {
    category: command.category,
    enablement: command.enablement,
    icon: command.icon,
    id: command.command,
    title: command.title,
  };
}

export function toKeybindingDefinition(keybinding: {
  args?: readonly unknown[];
  command: string;
  key: string;
  when?: string;
}): KeybindingDefinition {
  return {
    args: keybinding.args,
    command: keybinding.command,
    key: keybinding.key,
    when: keybinding.when,
  };
}

export function normalizeConfiguration(configuration: unknown): ConfigurationContribution {
  if (!isRecord(configuration) || !isRecord(configuration.properties)) {
    return { properties: {} };
  }

  return configuration as unknown as ConfigurationContribution;
}

export function normalizeMenuContributions(value: unknown): MenuContribution[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as MenuContribution[];
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([menu, entries]) => {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.map((entry) => ({ ...(entry as object), menu }) as MenuContribution);
  });
}

export function normalizeViewContainers(value: unknown): WorkbenchViewContainerContribution[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([location, containers]) => {
    if (!Array.isArray(containers)) {
      return [];
    }

    return containers.map(
      (container) =>
        ({
          ...(container as ViewContainerContribution),
          location,
        }) satisfies WorkbenchViewContainerContribution,
    );
  });
}

export function normalizeViews(value: unknown): WorkbenchViewContribution[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([containerId, views]) => {
    if (!Array.isArray(views)) {
      return [];
    }

    return views.map((view) => {
      const partialView = view as Partial<ViewContribution>;
      return {
        ...partialView,
        containerId: partialView.containerId ?? containerId,
      } as WorkbenchViewContribution;
    });
  });
}

export interface NormalizedPanelContributions {
  readonly containers: readonly WorkbenchViewContainerContribution[];
  readonly views: readonly WorkbenchViewContribution[];
}

/** Expand `contributes.panels` into panel view containers + views. */
export function normalizePanels(value: unknown): NormalizedPanelContributions {
  if (!Array.isArray(value)) {
    return { containers: [], views: [] };
  }

  const containers: WorkbenchViewContainerContribution[] = [];
  const views: WorkbenchViewContribution[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const panel = entry as Partial<PanelContribution>;
    if (
      typeof panel.id !== 'string' ||
      typeof panel.title !== 'string' ||
      typeof panel.viewId !== 'string'
    ) {
      continue;
    }

    containers.push({
      id: panel.id,
      location: 'panel',
      title: panel.title,
    });
    views.push({
      containerId: panel.id,
      id: panel.viewId,
      name: panel.title,
    });
  }

  return { containers, views };
}

export function normalizeStatusBar(value: unknown): StatusBarContribution[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is StatusBarContribution => {
    if (!isRecord(entry)) {
      return false;
    }

    return (
      typeof entry.id === 'string' &&
      typeof entry.text === 'string' &&
      (entry.alignment === 'left' || entry.alignment === 'right')
    );
  });
}
