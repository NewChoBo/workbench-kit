import { Emitter, type Disposable } from '@workbench-kit/base';

import { evaluateWhenClause } from './evaluate-when.js';
import { type ContextKeyChangeEvent, type ContextKeyValue } from './context-key-value.js';

export class ContextKeyService implements Disposable {
  private readonly onDidChangeContextEmitter = new Emitter<ContextKeyChangeEvent>();
  private readonly values = new Map<string, ContextKeyValue>();

  readonly onDidChangeContext = this.onDidChangeContextEmitter.event;

  createSnapshot(): Readonly<Record<string, ContextKeyValue>> {
    return Object.fromEntries(this.values);
  }

  delete(key: string): void {
    if (!this.values.has(key)) {
      return;
    }

    const previousValue = this.values.get(key);
    this.values.delete(key);
    this.onDidChangeContextEmitter.fire({
      key,
      previousValue,
      value: undefined,
    });
  }

  dispose(): void {
    this.values.clear();
    this.onDidChangeContextEmitter.dispose();
  }

  evaluateWhen(when: string | undefined): boolean {
    return evaluateWhenClause(when, this.createSnapshot());
  }

  get(key: string): ContextKeyValue {
    return this.values.get(key);
  }

  set(key: string, value: ContextKeyValue): void {
    const previousValue = this.values.get(key);
    if (previousValue === value) {
      return;
    }

    if (value === undefined) {
      this.values.delete(key);
    } else {
      this.values.set(key, value);
    }

    this.onDidChangeContextEmitter.fire({
      key,
      previousValue,
      value,
    });
  }
}
