import { WorkbenchActionSidebar } from '@workbench-kit/react/layout';

import './jdw-lab-view.css';

import { useWorkbench } from './provider.js';
import { useActiveEditorTab } from './use-editor.js';
import { useActiveWorkspacePath } from './use-active-workspace-path.js';
import {
  isSampleJdwLabViewRenderData,
  SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
  type SampleJdwLabViewRenderData,
} from './jdw-lab-view-data.js';

export type { SampleJdwLabViewRenderData };
export { isSampleJdwLabViewRenderData, SAMPLE_JDW_LAB_VIEW_RENDER_KIND };

const WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;

const DEFAULT_WIDGET_TREE_PATH = 'jdw/showcase/example.jdw.json';
const DEFAULT_TEMPLATE_JDW_PATH = 'jdw/templates/analytics-dashboard.jdw.json';

export interface SampleJdwLabViewProps {
  readonly templateJdwPath?: string | undefined;
  readonly widgetTreePath?: string | undefined;
}

function pathMatches(activePath: string | undefined, candidate: string): boolean {
  if (!activePath) {
    return false;
  }

  return activePath === candidate || activePath.endsWith(`/${candidate}`);
}

export function SampleJdwLabView({
  templateJdwPath = DEFAULT_TEMPLATE_JDW_PATH,
  widgetTreePath = DEFAULT_WIDGET_TREE_PATH,
}: SampleJdwLabViewProps = {}) {
  const { executeCommand } = useWorkbench();
  const activeTab = useActiveEditorTab();
  const activePath = useActiveWorkspacePath(activeTab?.resourceUri);

  return (
    <WorkbenchActionSidebar
      className="workbench-jdw-lab-view"
      data-testid="jdw-lab-view"
      items={[
        {
          description: widgetTreePath,
          icon: <i aria-hidden="true" className="codicon codicon-layout" />,
          id: 'widget-tree',
          label: 'Widget Tree',
          selected: pathMatches(activePath, widgetTreePath),
          testId: 'jdw-lab-open-widget-tree',
          title: `Open ${widgetTreePath}`,
        },
        {
          description: templateJdwPath,
          icon: <i aria-hidden="true" className="codicon codicon-symbol-structure" />,
          id: 'template-jdw',
          label: 'Template JDW',
          selected: pathMatches(activePath, templateJdwPath),
          testId: 'jdw-lab-open-template-jdw',
          title: `Open ${templateJdwPath}`,
        },
      ]}
      listProps={{
        'aria-label': 'JDW lab surfaces',
        className: 'workbench-jdw-lab-view__list',
      }}
      onSelect={(item) => {
        if (typeof item.description !== 'string' || item.description.length === 0) {
          return;
        }
        void executeCommand(WORKSPACE_OPEN_COMMAND_ID, { path: item.description });
      }}
    />
  );
}
