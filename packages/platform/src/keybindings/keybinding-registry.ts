import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';

import { evaluateWhenClause } from '../context/evaluate-when.js';
import type { ContextKeyValue } from '../context/context-key-value.js';
import { type KeybindingDefinition, type KeybindingMatch } from './types.js';

export class KeybindingRegistry implements Disposable {
  private readonly bindings: KeybindingDefinition[] = [];
  private readonly onDidRegisterKeybindingEmitter = new Emitter<KeybindingDefinition>();

  readonly onDidRegisterKeybinding = this.onDidRegisterKeybindingEmitter.event;

  getKeybindings(): readonly KeybindingDefinition[] {
    return [...this.bindings];
  }

  registerKeybinding(binding: KeybindingDefinition): Disposable {
    this.bindings.push(binding);
    this.onDidRegisterKeybindingEmitter.fire(binding);

    return toDisposable(() => {
      const index = this.bindings.indexOf(binding);
      if (index >= 0) {
        this.bindings.splice(index, 1);
      }
    });
  }

  resolveKeybindings(
    key: string,
    context: Readonly<Record<string, ContextKeyValue>> = {},
  ): readonly KeybindingMatch[] {
    return this.bindings
      .filter(
        (binding) =>
          binding.key === key &&
          (binding.when === undefined || evaluateWhenClause(binding.when, context)),
      )
      .map((binding) => ({
        ...binding,
        specificity: binding.when ? binding.when.length : 0,
      }))
      .sort((left, right) => right.specificity - left.specificity);
  }

  dispose(): void {
    this.bindings.length = 0;
    this.onDidRegisterKeybindingEmitter.dispose();
  }
}
