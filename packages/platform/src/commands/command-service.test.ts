import { describe, expect, it } from 'vitest';

import { ContextKeyService } from '../context/context-key-service.js';
import { CommandRegistry } from './command-registry.js';
import { CommandService } from './command-service.js';
import { CommandNotEnabledError } from './types.js';

describe('CommandService', () => {
  it('executes enabled commands through the registry', async () => {
    const registry = new CommandRegistry();
    const contextKeys = new ContextKeyService();
    const service = new CommandService({ registry, contextKeys });
    const calls: string[] = [];

    registry.registerCommand({
      id: 'workbench.action.test',
      title: 'Test',
      enablement: 'featureEnabled',
      handler: () => {
        calls.push('ran');
        return 'ok';
      },
    });
    contextKeys.set('featureEnabled', true);

    await expect(service.executeCommand('workbench.action.test')).resolves.toBe('ok');
    expect(calls).toEqual(['ran']);
  });

  it('rejects commands blocked by enablement when-clauses', async () => {
    const registry = new CommandRegistry();
    const contextKeys = new ContextKeyService();
    const service = new CommandService({ registry, contextKeys });

    registry.registerCommand({
      id: 'workbench.action.blocked',
      title: 'Blocked',
      enablement: 'featureEnabled',
      handler: () => undefined,
    });
    contextKeys.set('featureEnabled', false);

    await expect(service.executeCommand('workbench.action.blocked')).rejects.toBeInstanceOf(
      CommandNotEnabledError,
    );
    expect(service.canExecute('workbench.action.blocked')).toBe(false);
  });
});
