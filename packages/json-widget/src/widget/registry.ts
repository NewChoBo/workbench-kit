import type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetJsonSchema,
  WidgetRegistryContract,
  WidgetTypeDefinition,
  WidgetTypeShape,
} from '@workbench-kit/contracts';

export type { WidgetInspectorField, WidgetInspectorSection, WidgetJsonSchema };

export type WidgetDefinition<
  W extends WidgetTypeShape = WidgetTypeShape,
  TBuild = unknown,
> = WidgetTypeDefinition<W, TBuild>;

export class WidgetRegistry<
  TBuild = unknown,
  W extends WidgetTypeShape = WidgetTypeShape,
> implements WidgetRegistryContract<TBuild> {
  private _definitions: Map<string, WidgetDefinition<W, TBuild>> = new Map();

  constructor(entries: readonly WidgetDefinition<W, TBuild>[] = []) {
    this.bindMany(entries);
  }

  bind<TWidget extends W>(entry: WidgetDefinition<TWidget, TBuild>): this {
    this._definitions.set(entry.type, entry as WidgetDefinition<W, TBuild>);
    return this;
  }

  bindMany(entries: readonly WidgetDefinition<W, TBuild>[]): this {
    for (const entry of entries) this.bind(entry);
    return this;
  }

  has(type: string): boolean {
    return this._definitions.has(type);
  }

  get(type: string): TBuild | undefined {
    return this._definitions.get(type)?.build;
  }

  definition(type: string): WidgetDefinition<W, TBuild> | undefined {
    return this._definitions.get(type);
  }

  definitions(): readonly WidgetDefinition<W, TBuild>[] {
    return Array.from(this._definitions.values());
  }

  types(): readonly string[] {
    return Array.from(this._definitions.keys());
  }
}

export function createWidgetRegistry<TBuild = unknown, W extends WidgetTypeShape = WidgetTypeShape>(
  entries: readonly WidgetDefinition<W, TBuild>[] = [],
): WidgetRegistry<TBuild, W> {
  return new WidgetRegistry(entries);
}
