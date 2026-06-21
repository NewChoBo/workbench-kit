import type { CommandDefinition, KeybindingDefinition } from '@workbench-kit/platform';
import type {
  ConfigurationContribution,
  MenuContribution,
  ViewContainerContribution,
  ViewContribution,
} from '@workbench-kit/workbench-extension-sdk';

import type {
  WorkbenchViewContainerContribution,
  WorkbenchViewContribution,
} from './registries.js';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
