import { DisposableStore } from '@workbench-kit/base';
import type { CommandRegistry, KeybindingRegistry } from '@workbench-kit/platform';

import type {
  ActivityRegistry,
  ConfigurationRegistry,
  EditorRegistry,
  MenuRegistry,
  StatusBarRegistry,
  ViewRegistry,
} from '../contributions/registries.js';
import type { LocalizationRegistry } from '../localization/registry.js';
import type { ThemeRegistry } from '../theme/registry.js';
import {
  normalizeConfiguration,
  normalizeMenuContributions,
  normalizePanels,
  normalizeStatusBar,
  normalizeViewContainers,
  normalizeViews,
  toCommandDefinition,
  toKeybindingDefinition,
} from './contribution-normalizers.js';
import type { WorkbenchExtensionDescription } from './registry.js';

export interface ExtensionContributionRouterOptions {
  activities: ActivityRegistry;
  commands: CommandRegistry;
  configurations: ConfigurationRegistry;
  editors: EditorRegistry;
  keybindings: KeybindingRegistry;
  localizations: LocalizationRegistry;
  menus: MenuRegistry;
  statusBar: StatusBarRegistry;
  themes: ThemeRegistry;
  views: ViewRegistry;
}

export class ExtensionContributionRouter {
  constructor(private readonly options: ExtensionContributionRouterOptions) {}

  registerManifestContributions(description: WorkbenchExtensionDescription): DisposableStore {
    const disposables = new DisposableStore();
    const contributes = description.manifest.contributes;
    if (!contributes) {
      return disposables;
    }

    try {
      for (const command of contributes.commands ?? []) {
        disposables.add(this.options.commands.registerCommand(toCommandDefinition(command)));
      }

      for (const keybinding of contributes.keybindings ?? []) {
        disposables.add(
          this.options.keybindings.registerKeybinding(toKeybindingDefinition(keybinding)),
        );
      }

      for (const menu of normalizeMenuContributions(contributes.menus)) {
        disposables.add(this.options.menus.registerMenuItem(menu));
      }

      const panels = normalizePanels(contributes.panels);
      for (const container of panels.containers) {
        disposables.add(this.options.views.registerViewContainer(container));
      }

      for (const view of panels.views) {
        disposables.add(this.options.views.registerView(view));
      }

      for (const container of normalizeViewContainers(contributes.viewContainers)) {
        disposables.add(this.options.views.registerViewContainer(container));
      }

      for (const view of normalizeViews(contributes.views)) {
        disposables.add(this.options.views.registerView(view));
      }

      for (const activity of contributes.activities ?? []) {
        disposables.add(
          this.options.activities.registerActivity({
            ...activity,
            extensionId: description.manifest.id,
          }),
        );
      }

      for (const statusBarItem of normalizeStatusBar(contributes.statusBar)) {
        disposables.add(
          this.options.statusBar.registerStatusBarItem({
            ...statusBarItem,
            extensionId: description.manifest.id,
          }),
        );
      }

      for (const editor of contributes.editors ?? []) {
        disposables.add(
          this.options.editors.registerEditor({
            ...editor,
            extensionId: description.manifest.id,
          }),
        );
      }

      if (contributes.configuration !== undefined) {
        disposables.add(
          this.options.configurations.registerConfiguration(
            description.manifest.id,
            normalizeConfiguration(contributes.configuration),
          ),
        );
      }

      for (const theme of contributes.themes ?? []) {
        disposables.add(
          this.options.themes.registerTheme({
            ...theme,
            extensionId: description.manifest.id,
          }),
        );
      }

      for (const localization of contributes.localizations ?? []) {
        disposables.add(
          this.options.localizations.registerLocalization({
            ...localization,
            extensionId: description.manifest.id,
          }),
        );
      }

      return disposables;
    } catch (error) {
      disposables.dispose();
      throw error;
    }
  }
}
