import type { ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { WorkbenchPropertyInline } from '../../layout/WorkbenchPropertyPanel';
import type { IntegrationCommandAction } from './integration-command-action.js';

type IntegrationActionRowAlign = 'center' | 'start';
type IntegrationActionRowJustify = 'between' | 'end' | 'start';
type IntegrationCommandTone = 'accent' | 'danger' | 'ghost' | 'secondary' | 'warning';

export function IntegrationActionRow({
  align = 'start',
  children,
  dataAttributes,
  justify = 'start',
}: {
  align?: IntegrationActionRowAlign | undefined;
  children: ReactNode;
  dataAttributes?: Record<string, string> | undefined;
  justify?: IntegrationActionRowJustify | undefined;
}) {
  return (
    <WorkbenchPropertyInline
      data-justify={justify === 'between' ? 'between' : 'start'}
      {...(dataAttributes ?? {})}
      {...(align === 'center' ? { 'data-align': 'center' } : {})}
    >
      {children}
    </WorkbenchPropertyInline>
  );
}

export function IntegrationCommandButton<TCommandId extends string>({
  command,
  commandDataAttributeName,
  icon,
  tone = 'secondary',
}: {
  command: IntegrationCommandAction<TCommandId>;
  commandDataAttributeName?: string | undefined;
  icon?: string | undefined;
  tone?: IntegrationCommandTone | undefined;
}) {
  if (command.visible === false) {
    return null;
  }

  return (
    <Button
      compact
      disabled={!command.enabled}
      {...(icon === undefined ? {} : { icon })}
      onClick={() => {
        void command.execute();
      }}
      title={command.label}
      variant={resolveIntegrationCommandVariant(tone)}
      {...(commandDataAttributeName === undefined
        ? {}
        : { [commandDataAttributeName]: command.id })}
    >
      {command.label}
    </Button>
  );
}

function resolveIntegrationCommandVariant(
  tone: IntegrationCommandTone,
): 'danger' | 'default' | 'primary' {
  if (tone === 'accent') {
    return 'primary';
  }

  if (tone === 'danger') {
    return 'danger';
  }

  return 'default';
}
