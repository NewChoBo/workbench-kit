import { useMemo, useState } from 'react';

import { Button, ScrollArea } from '@workbench-kit/react/primitives';

import { useWorkbenchDevtoolsSnapshot } from './use-workbench-devtools-snapshot.js';

type DevtoolsSectionId =
  | 'commands'
  | 'contextKeys'
  | 'capabilities'
  | 'layout'
  | 'editor'
  | 'views'
  | 'transactions'
  | 'diagnostics';

const DEVTOOLS_SECTIONS: readonly {
  readonly id: DevtoolsSectionId;
  readonly label: string;
}[] = [
  { id: 'commands', label: 'Commands' },
  { id: 'contextKeys', label: 'Context keys' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'layout', label: 'Layout' },
  { id: 'editor', label: 'Editor' },
  { id: 'views', label: 'Views' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'diagnostics', label: 'Diagnostics' },
];

function formatSectionValue(
  sectionId: DevtoolsSectionId,
  snapshot: ReturnType<typeof useWorkbenchDevtoolsSnapshot>,
): string {
  switch (sectionId) {
    case 'commands':
      return JSON.stringify(snapshot.commands, null, 2);
    case 'contextKeys':
      return JSON.stringify(snapshot.contextKeys, null, 2);
    case 'capabilities':
      return JSON.stringify(
        {
          activeExtensions: snapshot.activeExtensions,
          capabilities: snapshot.capabilities,
        },
        null,
        2,
      );
    case 'layout':
      return JSON.stringify(snapshot.layout, null, 2);
    case 'editor':
      return JSON.stringify(snapshot.editor, null, 2);
    case 'views':
      return JSON.stringify(
        {
          activities: snapshot.activities,
          viewContainers: snapshot.viewContainers,
          views: snapshot.views,
        },
        null,
        2,
      );
    case 'transactions':
      return JSON.stringify(snapshot.transactions, null, 2);
    case 'diagnostics':
      return JSON.stringify(snapshot.dependencyDiagnostics, null, 2);
    default:
      return '';
  }
}

export function WorkbenchDevtoolsPanel() {
  const snapshot = useWorkbenchDevtoolsSnapshot();
  const [activeSection, setActiveSection] = useState<DevtoolsSectionId>('commands');
  const sectionValue = useMemo(
    () => formatSectionValue(activeSection, snapshot),
    [activeSection, snapshot],
  );

  return (
    <aside
      aria-label="Workbench devtools"
      className="workbench-devtools-panel"
      data-testid="workbench-devtools-panel"
    >
      <header className="workbench-devtools-panel__header">
        <strong>Workbench Devtools</strong>
        <span className="workbench-devtools-panel__meta">Read-only</span>
      </header>
      <p className="workbench-devtools-panel__timestamp">Updated {snapshot.capturedAt}</p>
      <nav aria-label="Devtools sections" className="workbench-devtools-panel__tabs">
        {DEVTOOLS_SECTIONS.map((section) => (
          <Button
            key={section.id}
            aria-pressed={activeSection === section.id}
            compact
            className="workbench-devtools-panel__tab"
            onClick={() => {
              setActiveSection(section.id);
            }}
          >
            {section.label}
          </Button>
        ))}
      </nav>
      <ScrollArea
        as="pre"
        className="workbench-devtools-panel__output"
        gutter="stable"
        orientation="vertical"
      >
        {sectionValue}
      </ScrollArea>
    </aside>
  );
}
