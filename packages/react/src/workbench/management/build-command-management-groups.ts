import type { CommandManagementEntry, CommandManagementGroup } from './types.js';

interface BuildCommandManagementGroupsInput {
  readonly extensionCommands: readonly {
    readonly category?: string | undefined;
    readonly extensionId: string;
    readonly extensionLabel: string;
    readonly handler?: unknown;
    readonly id: string;
    readonly label: string;
  }[];
  readonly keybindingsByCommandId?: Readonly<Record<string, string>> | undefined;
  readonly menuSurfacesByCommandId?: Readonly<Record<string, readonly string[]>> | undefined;
  readonly shellCommands?: readonly {
    readonly category?: string | undefined;
    readonly handler?: unknown;
    readonly id: string;
    readonly label: string;
  }[] | undefined;
}

function toEntry(
  command: {
    readonly category?: string | undefined;
    readonly handler?: unknown;
    readonly id: string;
    readonly label: string;
  },
  source: string,
  sourceLabel: string,
  keybindingsByCommandId: Readonly<Record<string, string>> | undefined,
  menuSurfacesByCommandId: Readonly<Record<string, readonly string[]>> | undefined,
): CommandManagementEntry {
  const status = command.handler ? 'available' : 'no-handler';

  return {
    category: command.category,
    id: command.id,
    keybinding: keybindingsByCommandId?.[command.id],
    label: command.label,
    menuSurfaces: menuSurfacesByCommandId?.[command.id],
    source,
    sourceLabel,
    status,
  };
}

export function buildCommandManagementGroups({
  extensionCommands,
  keybindingsByCommandId,
  menuSurfacesByCommandId,
  shellCommands = [],
}: BuildCommandManagementGroupsInput): CommandManagementGroup[] {
  const groups = new Map<string, { entries: CommandManagementEntry[]; id: string; label: string }>();
  const ensureGroup = (id: string, label: string) => {
    const existing = groups.get(id);
    if (existing) {
      return existing;
    }

    const created = { entries: [] as CommandManagementEntry[], id, label };
    groups.set(id, created);
    return created;
  };

  for (const command of shellCommands) {
    const group = ensureGroup('workbench.shell', 'Workbench Shell');
    group.entries.push(
      toEntry(command, 'workbench.shell', 'Workbench Shell', keybindingsByCommandId, menuSurfacesByCommandId),
    );
  }

  for (const command of extensionCommands) {
    const group = ensureGroup(command.extensionId, command.extensionLabel);
    group.entries.push(
      toEntry(
        command,
        command.extensionId,
        command.extensionLabel,
        keybindingsByCommandId,
        menuSurfacesByCommandId,
      ),
    );
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function filterCommandManagementGroups(
  groups: readonly CommandManagementGroup[],
  query: string,
): CommandManagementGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...groups];
  }

  return groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => {
        const haystack = [
          entry.label,
          entry.id,
          entry.category,
          entry.sourceLabel,
          entry.keybinding,
          ...(entry.menuSurfaces ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      }),
    }))
    .filter((group) => group.entries.length > 0);
}

export function countCommandManagementEntries(groups: readonly CommandManagementGroup[]): number {
  return groups.reduce((total, group) => total + group.entries.length, 0);
}
