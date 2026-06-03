import type {
  InstalledPlugin,
  PluginDescriptor,
  PluginLifecycleFailure,
  PluginLifecycleResult,
  PluginLifecycleService,
  PluginSource,
} from '@newchobo-ui/contracts';

export interface InMemoryPluginLifecycleServiceOptions {
  now?: () => string;
  plugins?: Iterable<InstalledPlugin>;
}

export interface InMemoryPluginLifecycleService extends PluginLifecycleService {}

export class InMemoryPluginLifecycleService implements PluginLifecycleService {
  private readonly now: () => string;
  private readonly plugins = new Map<string, InstalledPlugin>();

  constructor({ now = defaultNow, plugins = [] }: InMemoryPluginLifecycleServiceOptions = {}) {
    this.now = now;
    for (const plugin of plugins) {
      this.plugins.set(plugin.descriptor.pluginId, clonePlugin(plugin));
    }
  }

  async install(
    source: PluginSource,
    options: { descriptor?: PluginDescriptor; force?: boolean } = {},
  ): Promise<PluginLifecycleResult> {
    const descriptor = options.descriptor;
    if (!descriptor?.pluginId || !descriptor?.version || !descriptor?.displayName) {
      return this.failure(
        source,
        descriptor?.pluginId,
        'invalid-descriptor',
        'Descriptor must contain pluginId, version, and displayName.',
      );
    }

    const existing = this.plugins.get(descriptor.pluginId);
    if (existing && options.force !== true) {
      return this.failure(
        source,
        descriptor.pluginId,
        'invalid-state',
        `Plugin '${descriptor.pluginId}' is already installed.`,
      );
    }

    const timestamp = this.now();
    const installed: InstalledPlugin = {
      ...existing,
      contributions: existing?.contributions,
      descriptor,
      enabled: 'enabled',
      error: undefined,
      installedAt: timestamp,
      source,
      state: 'installing',
      trust: existing?.trust ?? 'unknown',
      updatedAt: timestamp,
    };
    this.plugins.set(descriptor.pluginId, installed);

    const completed = {
      ...installed,
      state: 'installed',
      updatedAt: this.now(),
    };
    this.plugins.set(descriptor.pluginId, completed);
    return this.success(completed);
  }

  async enable(pluginId: string, enabled: boolean): Promise<PluginLifecycleResult> {
    const existing = this.plugins.get(pluginId);
    if (!existing) {
      return this.failure(
        undefined,
        pluginId,
        'not-found',
        `Plugin '${pluginId}' is not installed.`,
      );
    }

    if (existing.state === 'failed' && enabled) {
      return this.failure(
        undefined,
        pluginId,
        'invalid-state',
        `Plugin '${pluginId}' is in failed state.`,
      );
    }

    const next: InstalledPlugin = {
      ...existing,
      enabled: enabled ? 'enabled' : 'disabled',
      state: enabled ? (existing.state === 'disabled' ? 'installed' : existing.state) : 'disabled',
      updatedAt: this.now(),
    };
    this.plugins.set(pluginId, next);
    return this.success(next);
  }

  async uninstall(pluginId: string): Promise<PluginLifecycleResult> {
    const existing = this.plugins.get(pluginId);
    if (!existing) {
      return this.failure(
        undefined,
        pluginId,
        'not-found',
        `Plugin '${pluginId}' is not installed.`,
      );
    }

    this.plugins.delete(pluginId);
    return this.success({
      ...existing,
      state: 'uninstalled',
      updatedAt: this.now(),
      enabled: 'disabled',
    });
  }

  async update(
    pluginId: string,
    source?: PluginSource,
  ): Promise<PluginLifecycleResult> {
    const existing = this.plugins.get(pluginId);
    if (!existing) {
      return this.failure(
        source,
        pluginId,
        'not-found',
        `Plugin '${pluginId}' is not installed.`,
      );
    }

    const next: InstalledPlugin = {
      ...existing,
      state: 'updating',
      source: source ?? existing.source,
      updatedAt: this.now(),
    };
    this.plugins.set(pluginId, next);

    const completed: InstalledPlugin = {
      ...next,
      state: 'installed',
      updatedAt: this.now(),
    };
    this.plugins.set(pluginId, completed);
    return this.success(completed);
  }

  private success(plugin: InstalledPlugin): PluginLifecycleResult {
    return { kind: 'plugin:success', plugin };
  }

  private failure(
    source: PluginSource | undefined,
    pluginId: string | undefined,
    code: PluginLifecycleFailure['code'],
    message: string,
  ): PluginLifecycleResult {
    return {
      kind: 'plugin:failure',
      code,
      message,
      pluginId,
      source,
    };
  }
}

export function createInMemoryPluginLifecycleService(
  options: InMemoryPluginLifecycleServiceOptions = {},
): InMemoryPluginLifecycleService {
  return new InMemoryPluginLifecycleService(options);
}

function clonePlugin(plugin: InstalledPlugin): InstalledPlugin {
  return {
    ...plugin,
    descriptor: { ...plugin.descriptor },
    source: { ...plugin.source },
  };
}

function defaultNow() {
  return new Date().toISOString();
}
