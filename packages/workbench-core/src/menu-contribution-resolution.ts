import {
  resolveCommandMenuItems,
  type CommandRegistry,
  type ResolvedCommandMenuCommandItem,
} from '@workbench-kit/platform';
import type { MenuContribution } from '@workbench-kit/workbench-extension-sdk';

export interface ResolvedWorkbenchMenuContributionItem extends ResolvedCommandMenuCommandItem {
  readonly contribution: MenuContribution;
  readonly group?: string | undefined;
  readonly menu: string;
  readonly order?: number | undefined;
}

export interface ResolveWorkbenchMenuContributionsInput<TContext = void> {
  readonly commandRegistry: CommandRegistry<TContext>;
  readonly context: TContext;
  readonly contextKeys?: object | undefined;
  readonly menu: string;
  readonly menuItems: readonly MenuContribution[];
}

export function resolveWorkbenchMenuContributions<TContext>({
  commandRegistry,
  context,
  contextKeys,
  menu,
  menuItems,
}: ResolveWorkbenchMenuContributionsInput<TContext>): readonly ResolvedWorkbenchMenuContributionItem[] {
  const contributionByEntryId = new Map<string, MenuContribution>();
  const entries = menuItems
    .filter((item) => item.menu === menu)
    .map((item, index) => {
      const id = `${item.menu}:${item.command}:${index}`;
      contributionByEntryId.set(id, item);

      return {
        commandId: item.command,
        id,
        when: item.when,
      };
    });

  return resolveCommandMenuItems({
    context,
    contextKeys,
    entries,
    registry: commandRegistry,
  }).flatMap((item) => {
    if (item.type !== 'command') {
      return [];
    }

    const contribution = contributionByEntryId.get(item.id);
    if (!contribution) {
      return [];
    }

    return [
      {
        ...item,
        contribution,
        group: contribution.group,
        menu: contribution.menu,
        order: contribution.order,
      },
    ];
  });
}
