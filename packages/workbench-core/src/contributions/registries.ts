import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';
import type {
  ActivityContribution,
  ConfigurationContribution,
  EditorContribution,
  MenuContribution,
  ViewContainerContribution,
  ViewContribution,
  ViewProvider,
} from '@workbench-kit/workbench-extension-sdk';

export interface WorkbenchViewContribution extends ViewContribution {
  containerId: string;
}

export interface WorkbenchViewContainerContribution extends ViewContainerContribution {
  location: string;
}

export interface WorkbenchActivityContribution extends ActivityContribution {
  extensionId?: string;
}

export interface WorkbenchConfigurationContribution {
  extensionId: string;
  configuration: ConfigurationContribution;
}

interface MenuContributionRecord {
  readonly item: MenuContribution;
  readonly sequence: number;
}

function orderMenuContributionRecords(
  records: readonly MenuContributionRecord[],
): readonly MenuContribution[] {
  const groupOrder = new Map<string, number>();
  records.forEach((record) => {
    const group = record.item.group ?? '';
    if (!groupOrder.has(group)) {
      groupOrder.set(group, groupOrder.size);
    }
  });

  return [...records]
    .sort((left, right) => {
      const leftGroupOrder = groupOrder.get(left.item.group ?? '') ?? 0;
      const rightGroupOrder = groupOrder.get(right.item.group ?? '') ?? 0;
      if (leftGroupOrder !== rightGroupOrder) {
        return leftGroupOrder - rightGroupOrder;
      }

      const leftOrder = left.item.order ?? 0;
      const rightOrder = right.item.order ?? 0;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.sequence - right.sequence;
    })
    .map((record) => record.item);
}

export class MenuRegistry implements Disposable {
  private readonly itemsByMenu = new Map<string, MenuContributionRecord[]>();
  private readonly onDidRegisterMenuItemEmitter = new Emitter<MenuContribution>();
  private menuItemSequence = 0;

  readonly onDidRegisterMenuItem = this.onDidRegisterMenuItemEmitter.event;

  getMenuItems(menu?: string): readonly MenuContribution[] {
    if (menu !== undefined) {
      return orderMenuContributionRecords(this.itemsByMenu.get(menu) ?? []);
    }

    return [...this.itemsByMenu.values()].flat().map((record) => record.item);
  }

  registerMenuItem(item: MenuContribution): Disposable {
    const record: MenuContributionRecord = {
      item,
      sequence: this.menuItemSequence,
    };
    this.menuItemSequence += 1;

    const items = this.itemsByMenu.get(item.menu) ?? [];
    items.push(record);
    this.itemsByMenu.set(item.menu, items);
    this.onDidRegisterMenuItemEmitter.fire(item);

    return toDisposable(() => {
      const currentItems = this.itemsByMenu.get(item.menu);
      if (!currentItems) return;

      const index = currentItems.indexOf(record);
      if (index >= 0) {
        currentItems.splice(index, 1);
      }

      if (currentItems.length === 0) {
        this.itemsByMenu.delete(item.menu);
      }
    });
  }

  dispose(): void {
    this.itemsByMenu.clear();
    this.menuItemSequence = 0;
    this.onDidRegisterMenuItemEmitter.dispose();
  }
}

export class ViewRegistry implements Disposable {
  private readonly containersById = new Map<string, WorkbenchViewContainerContribution>();
  private readonly providersByViewId = new Map<string, ViewProvider>();
  private readonly viewsById = new Map<string, WorkbenchViewContribution>();
  private readonly onDidRegisterViewEmitter = new Emitter<WorkbenchViewContribution>();
  private readonly onDidRegisterViewContainerEmitter =
    new Emitter<WorkbenchViewContainerContribution>();
  private readonly onDidRegisterViewProviderEmitter = new Emitter<ViewProvider>();

  readonly onDidRegisterView = this.onDidRegisterViewEmitter.event;
  readonly onDidRegisterViewContainer = this.onDidRegisterViewContainerEmitter.event;
  readonly onDidRegisterViewProvider = this.onDidRegisterViewProviderEmitter.event;

  getView(viewId: string): WorkbenchViewContribution | undefined {
    return this.viewsById.get(viewId);
  }

  getViewContainer(containerId: string): WorkbenchViewContainerContribution | undefined {
    return this.containersById.get(containerId);
  }

  getViewProvider(viewId: string): ViewProvider | undefined {
    return this.providersByViewId.get(viewId);
  }

  getViewProviders(): readonly ViewProvider[] {
    return [...this.providersByViewId.values()];
  }

  getViewContainers(location?: string): readonly WorkbenchViewContainerContribution[] {
    const containers = [...this.containersById.values()];
    if (location === undefined) {
      return containers;
    }

    return containers.filter((container) => container.location === location);
  }

  getViews(containerId?: string): readonly WorkbenchViewContribution[] {
    const views = [...this.viewsById.values()];
    if (containerId === undefined) {
      return views;
    }

    return views.filter((view) => view.containerId === containerId);
  }

  registerView(view: WorkbenchViewContribution): Disposable {
    if (this.viewsById.has(view.id)) {
      throw new Error(`View "${view.id}" is already registered.`);
    }

    this.viewsById.set(view.id, view);
    this.onDidRegisterViewEmitter.fire(view);

    return toDisposable(() => {
      const current = this.viewsById.get(view.id);
      if (current === view) {
        this.viewsById.delete(view.id);
      }
    });
  }

  registerViewProvider(provider: ViewProvider): Disposable {
    if (this.providersByViewId.has(provider.viewId)) {
      throw new Error(`View provider for "${provider.viewId}" is already registered.`);
    }

    this.providersByViewId.set(provider.viewId, provider);
    this.onDidRegisterViewProviderEmitter.fire(provider);

    return toDisposable(() => {
      const current = this.providersByViewId.get(provider.viewId);
      if (current === provider) {
        this.providersByViewId.delete(provider.viewId);
      }
    });
  }

  registerViewContainer(container: WorkbenchViewContainerContribution): Disposable {
    if (this.containersById.has(container.id)) {
      throw new Error(`View container "${container.id}" is already registered.`);
    }

    this.containersById.set(container.id, container);
    this.onDidRegisterViewContainerEmitter.fire(container);

    return toDisposable(() => {
      const current = this.containersById.get(container.id);
      if (current === container) {
        this.containersById.delete(container.id);
      }
    });
  }

  dispose(): void {
    this.containersById.clear();
    this.providersByViewId.clear();
    this.viewsById.clear();
    this.onDidRegisterViewEmitter.dispose();
    this.onDidRegisterViewContainerEmitter.dispose();
    this.onDidRegisterViewProviderEmitter.dispose();
  }
}

export interface WorkbenchEditorContribution extends EditorContribution {
  extensionId?: string;
}

export class EditorRegistry implements Disposable {
  private readonly editorsById = new Map<string, WorkbenchEditorContribution>();
  private readonly onDidRegisterEditorEmitter = new Emitter<WorkbenchEditorContribution>();

  readonly onDidRegisterEditor = this.onDidRegisterEditorEmitter.event;

  getEditor(editorId: string): WorkbenchEditorContribution | undefined {
    return this.editorsById.get(editorId);
  }

  getEditors(): readonly WorkbenchEditorContribution[] {
    return [...this.editorsById.values()];
  }

  registerEditor(editor: WorkbenchEditorContribution): Disposable {
    if (this.editorsById.has(editor.id)) {
      throw new Error(`Editor "${editor.id}" is already registered.`);
    }

    this.editorsById.set(editor.id, editor);
    this.onDidRegisterEditorEmitter.fire(editor);

    return toDisposable(() => {
      const current = this.editorsById.get(editor.id);
      if (current === editor) {
        this.editorsById.delete(editor.id);
      }
    });
  }

  dispose(): void {
    this.editorsById.clear();
    this.onDidRegisterEditorEmitter.dispose();
  }
}

export class ActivityRegistry implements Disposable {
  private readonly activitiesById = new Map<string, WorkbenchActivityContribution>();
  private readonly onDidRegisterActivityEmitter = new Emitter<WorkbenchActivityContribution>();

  readonly onDidRegisterActivity = this.onDidRegisterActivityEmitter.event;

  getActivities(): readonly WorkbenchActivityContribution[] {
    return [...this.activitiesById.values()];
  }

  getActivity(activityId: string): WorkbenchActivityContribution | undefined {
    return this.activitiesById.get(activityId);
  }

  registerActivity(activity: WorkbenchActivityContribution): Disposable {
    if (this.activitiesById.has(activity.id)) {
      throw new Error(`Activity "${activity.id}" is already registered.`);
    }

    this.activitiesById.set(activity.id, activity);
    this.onDidRegisterActivityEmitter.fire(activity);

    return toDisposable(() => {
      const current = this.activitiesById.get(activity.id);
      if (current === activity) {
        this.activitiesById.delete(activity.id);
      }
    });
  }

  dispose(): void {
    this.activitiesById.clear();
    this.onDidRegisterActivityEmitter.dispose();
  }
}

export class ConfigurationRegistry implements Disposable {
  private readonly configurationsByExtension = new Map<string, ConfigurationContribution>();

  getConfiguration(extensionId: string): ConfigurationContribution | undefined {
    return this.configurationsByExtension.get(extensionId);
  }

  getConfigurations(): readonly WorkbenchConfigurationContribution[] {
    return [...this.configurationsByExtension.entries()].map(([extensionId, configuration]) => ({
      extensionId,
      configuration,
    }));
  }

  registerConfiguration(extensionId: string, configuration: ConfigurationContribution): Disposable {
    this.configurationsByExtension.set(extensionId, configuration);

    return toDisposable(() => {
      const current = this.configurationsByExtension.get(extensionId);
      if (current === configuration) {
        this.configurationsByExtension.delete(extensionId);
      }
    });
  }

  dispose(): void {
    this.configurationsByExtension.clear();
  }
}
