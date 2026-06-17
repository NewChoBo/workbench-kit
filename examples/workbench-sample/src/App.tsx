import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, ScrollArea } from '@workbench-kit/react/primitives';
import type { StatusBarSectionModel } from '@workbench-kit/react/workbench/shell';
import type { WorkspaceEditorTheme } from '@workbench-kit/react/workbench/workspace/editor';
import { createWorkbenchWorkspaceHostPort } from '@workbench-kit/workspace';
import {
  EditorArea,
  WorkbenchProvider,
  WorkbenchShell,
  useWorkbench,
} from '@workbench-kit/workbench-react';

import {
  extensionsConfig,
  initialLayout,
  initialWorkspace,
  SAMPLE_APP_PATH,
  SAMPLE_JDW_DOCUMENT_PATH,
  SAMPLE_JDW_NODE_SCHEMA_PATH,
  SAMPLE_JDW_SCHEMA_PATH,
  SAMPLE_README_PATH,
  SAMPLE_SHOWCASE_CONFIG_PATH,
  SAMPLE_SHOWCASE_EXTENSIONS_PATH,
  SAMPLE_SHOWCASE_JDW_PATH,
  SAMPLE_SHOWCASE_REACT_PATH,
  SAMPLE_SHOWCASE_WORKBENCH_REACT_PATH,
  SAMPLE_SHOWCASE_WORKSPACE_PATH,
  workspaceInfo,
} from './bootstrap.js';

const workspaceHostPort = createWorkbenchWorkspaceHostPort();
let sampleWorkspaceInitialized = false;

const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';

type SampleTheme = WorkspaceEditorTheme;

interface SampleOpenTarget {
  readonly detail: string;
  readonly icon: string;
  readonly label: string;
  readonly path: string;
  readonly tags: readonly string[];
}

interface SampleShowcaseItem extends SampleOpenTarget {
  readonly packageName: string;
}

const SAMPLE_OPEN_TARGETS: readonly SampleOpenTarget[] = [
  {
    detail: 'Monaco editor, TypeScript icon, tab actions',
    icon: 'codicon-symbol-class',
    label: 'App.tsx',
    path: SAMPLE_APP_PATH,
    tags: ['code', 'tabs'],
  },
  {
    detail: 'Markdown source and preview-ready document',
    icon: 'codicon-markdown',
    label: 'README.md',
    path: SAMPLE_README_PATH,
    tags: ['docs'],
  },
  {
    detail: 'Code, form, preview split from one JSON source',
    icon: 'codicon-layout',
    label: 'workbench-sample.jdw.json',
    path: SAMPLE_JDW_DOCUMENT_PATH,
    tags: ['jdw', 'preview'],
  },
  {
    detail: 'Schema file opens as JSON code/form without JDW preview',
    icon: 'codicon-json',
    label: 'widget-document schema',
    path: SAMPLE_JDW_SCHEMA_PATH,
    tags: ['schema'],
  },
  {
    detail: 'Reusable JDW node schema imported from the package',
    icon: 'codicon-symbol-structure',
    label: 'jdw-node schema',
    path: SAMPLE_JDW_NODE_SCHEMA_PATH,
    tags: ['schema'],
  },
];

const SAMPLE_SHOWCASE_ITEMS: readonly SampleShowcaseItem[] = [
  {
    detail: 'Provider, shell chrome, editor tabs, status wiring',
    icon: 'codicon-layout',
    label: 'Workbench shell assembly',
    packageName: '@workbench-kit/workbench-react',
    path: SAMPLE_SHOWCASE_WORKBENCH_REACT_PATH,
    tags: ['shell', 'editor'],
  },
  {
    detail: 'Primitives, ScrollArea, settings UI, workspace UI exports',
    icon: 'codicon-symbol-interface',
    label: 'Reusable React surfaces',
    packageName: '@workbench-kit/react',
    path: SAMPLE_SHOWCASE_REACT_PATH,
    tags: ['primitives', 'ui'],
  },
  {
    detail: 'Virtual file tree, host port, explorer/editor transactions',
    icon: 'codicon-root-folder-opened',
    label: 'Workspace state model',
    packageName: '@workbench-kit/workspace',
    path: SAMPLE_SHOWCASE_WORKSPACE_PATH,
    tags: ['workspace'],
  },
  {
    detail: 'Headless schema, parse, validate, and preview pipeline',
    icon: 'codicon-json',
    label: 'JSON Dynamic Widget engine',
    packageName: '@workbench-kit/jdw',
    path: SAMPLE_SHOWCASE_JDW_PATH,
    tags: ['jdw', 'schema'],
  },
  {
    detail: 'Repository .workbench files parsed into host state',
    icon: 'codicon-settings',
    label: 'Shareable workbench config',
    packageName: '@workbench-kit/workbench-config',
    path: SAMPLE_SHOWCASE_CONFIG_PATH,
    tags: ['config'],
  },
  {
    detail: 'Manifest contributions, commands, capabilities, built-ins',
    icon: 'codicon-extensions',
    label: 'Extension contribution contracts',
    packageName: '@workbench-kit/workbench-extension-sdk',
    path: SAMPLE_SHOWCASE_EXTENSIONS_PATH,
    tags: ['extensions'],
  },
];

const SAMPLE_REVIEW_PATHS = SAMPLE_OPEN_TARGETS.map((target) => target.path);

export function App() {
  const [theme, setTheme] = useState<SampleTheme>('dark');
  const statusSections = useMemo(() => createSampleStatusSections(theme), [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <WorkbenchProvider
      extensionsConfig={extensionsConfig}
      initialLayout={initialLayout}
      workspaceHostPort={workspaceHostPort}
    >
      <WorkspaceInitCommand />
      <WorkbenchShell
        editorArea={
          <SampleEditorFrame theme={theme} onThemeChange={setTheme}>
            <EditorSaveShortcut />
          </SampleEditorFrame>
        }
        onStatusItemActivate={(item) => {
          if (item.id === 'sample.theme') {
            setTheme((current) => nextSampleTheme(current));
          }
        }}
        rootClassName="ide-root"
        statusSections={statusSections}
        theme={theme}
      />
    </WorkbenchProvider>
  );
}

function WorkspaceInitCommand() {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    if (sampleWorkspaceInitialized) {
      return;
    }

    sampleWorkspaceInitialized = true;
    void executeCommand('workspace.init', initialWorkspace).catch(() => {
      sampleWorkspaceInitialized = false;
    });
  }, [executeCommand]);

  return null;
}

function EditorSaveShortcut() {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void executeCommand('editor.save');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [executeCommand]);

  return null;
}

function SampleEditorFrame({
  children,
  theme,
  onThemeChange,
}: {
  children: ReactNode;
  theme: SampleTheme;
  onThemeChange: (theme: SampleTheme) => void;
}) {
  return (
    <section className="workbench-sample-editor-frame" aria-label="Sample editor workspace">
      <SampleWorkbenchToolbar theme={theme} onThemeChange={onThemeChange} />
      {children}
      <EditorArea
        emptyState={<SampleEditorOverview theme={theme} onThemeChange={onThemeChange} />}
        theme={theme}
      />
    </section>
  );
}

function SampleWorkbenchToolbar({
  theme,
  onThemeChange,
}: {
  theme: SampleTheme;
  onThemeChange: (theme: SampleTheme) => void;
}) {
  const { executeCommand } = useWorkbench();

  return (
    <header className="workbench-sample-toolbar">
      <div className="workbench-sample-toolbar__title">
        <i aria-hidden className="codicon codicon-layout" />
        <span>Workbench Sample</span>
        <Badge variant="muted">{workspaceInfo.fileCount} files</Badge>
      </div>
      <div className="workbench-sample-toolbar__actions">
        <div className="workbench-sample-theme-switch" role="group" aria-label="Workbench theme">
          <button
            aria-label="Use dark theme"
            className="workbench-sample-theme-switch__button"
            data-active={theme === 'dark' ? 'true' : undefined}
            title="Dark theme"
            type="button"
            onClick={() => onThemeChange('dark')}
          >
            <i aria-hidden className="codicon codicon-color-mode" />
          </button>
          <button
            aria-label="Use light theme"
            className="workbench-sample-theme-switch__button"
            data-active={theme === 'light' ? 'true' : undefined}
            title="Light theme"
            type="button"
            onClick={() => onThemeChange('light')}
          >
            <i aria-hidden className="codicon codicon-lightbulb" />
          </button>
        </div>
        <Button
          compact
          icon="codicon-files"
          onClick={() => {
            void executeCommand('workspace.open', { paths: SAMPLE_REVIEW_PATHS });
          }}
        >
          Open review set
        </Button>
      </div>
    </header>
  );
}

function SampleEditorOverview({
  theme,
  onThemeChange,
}: {
  theme: SampleTheme;
  onThemeChange: (theme: SampleTheme) => void;
}) {
  const { executeCommand, extensionRegistry, layoutService } = useWorkbench();
  const settingsContributionCount = extensionRegistry.configurations.getConfigurations().length;

  return (
    <ScrollArea
      aria-label="Workbench sample showcase"
      as="section"
      className="workbench-sample-overview"
      orientation="vertical"
    >
      <div className="workbench-sample-overview__summary">
        <div className="workbench-sample-overview__heading">
          <span className="workbench-sample-overview__eyebrow">Workbench Kit</span>
          <h1>Integrated Library Showcase</h1>
        </div>
        <dl className="workbench-sample-overview__metrics">
          <SampleMetric label="Workspace" value={workspaceInfo.name} />
          <SampleMetric label="Roots" value={workspaceInfo.rootFolderCount} />
          <SampleMetric label="Folders" value={workspaceInfo.folderCount} />
          <SampleMetric label="Files" value={workspaceInfo.fileCount} />
          <SampleMetric label="Extensions" value={extensionsConfig.enabled.length} />
          <SampleMetric label="Settings" value={settingsContributionCount} />
          <SampleMetric label="Theme" value={theme} />
        </dl>
      </div>

      <div className="workbench-sample-overview__actions">
        <Button
          icon="codicon-files"
          variant="primary"
          onClick={() => {
            void executeCommand('workspace.open', { paths: SAMPLE_REVIEW_PATHS });
          }}
        >
          Open review set
        </Button>
        <Button
          icon="codicon-folder-opened"
          onClick={() => {
            layoutService.setActiveViewContainer('explorer');
            layoutService.setSideBarVisible(true);
          }}
        >
          Show explorer
        </Button>
        <Button
          icon="codicon-settings-gear"
          onClick={() => {
            void executeCommand(OPEN_SETTINGS_COMMAND_ID);
          }}
        >
          Open settings
        </Button>
        <div className="workbench-sample-overview__theme" role="group" aria-label="Theme">
          <button
            className="workbench-sample-overview__theme-button"
            data-active={theme === 'dark' ? 'true' : undefined}
            title="Dark theme"
            type="button"
            onClick={() => onThemeChange('dark')}
          >
            <i aria-hidden className="codicon codicon-color-mode" />
            <span>Dark</span>
          </button>
          <button
            className="workbench-sample-overview__theme-button"
            data-active={theme === 'light' ? 'true' : undefined}
            title="Light theme"
            type="button"
            onClick={() => onThemeChange('light')}
          >
            <i aria-hidden className="codicon codicon-lightbulb" />
            <span>Light</span>
          </button>
        </div>
      </div>

      <SampleShowcaseSection
        items={SAMPLE_SHOWCASE_ITEMS}
        onOpen={(path) => {
          void executeCommand('workspace.open', { path });
        }}
      />

      <section className="workbench-sample-section" aria-labelledby="sample-review-targets-title">
        <div className="workbench-sample-section__header">
          <div>
            <span className="workbench-sample-overview__eyebrow">Runtime surfaces</span>
            <h2 id="sample-review-targets-title">Review Targets</h2>
          </div>
          <Badge variant="muted">{SAMPLE_OPEN_TARGETS.length} files</Badge>
        </div>
        <div className="workbench-sample-overview__grid" aria-label="Sample review targets">
          {SAMPLE_OPEN_TARGETS.map((target) => (
            <SampleOpenTargetCard
              key={target.path}
              target={target}
              onOpen={(path) => {
                void executeCommand('workspace.open', { path });
              }}
            />
          ))}
        </div>
      </section>
    </ScrollArea>
  );
}

function SampleShowcaseSection({
  items,
  onOpen,
}: {
  items: readonly SampleShowcaseItem[];
  onOpen: (path: string) => void;
}) {
  return (
    <section className="workbench-sample-section" aria-labelledby="sample-library-showcase-title">
      <div className="workbench-sample-section__header">
        <div>
          <span className="workbench-sample-overview__eyebrow">Integrated packages</span>
          <h2 id="sample-library-showcase-title">Library Showcase</h2>
        </div>
        <Badge variant="muted">{items.length} packages</Badge>
      </div>
      <div className="workbench-sample-library-grid" aria-label="Workbench Kit library showcase">
        {items.map((item) => (
          <SampleOpenTargetCard
            key={item.packageName}
            target={item}
            variant="library"
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function SampleOpenTargetCard({
  target,
  variant = 'review',
  onOpen,
}: {
  target: SampleOpenTarget | SampleShowcaseItem;
  variant?: 'library' | 'review';
  onOpen: (path: string) => void;
}) {
  const packageName = 'packageName' in target ? target.packageName : undefined;
  const className = [
    'workbench-sample-target',
    variant === 'library' ? 'workbench-sample-target--library' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} type="button" onClick={() => onOpen(target.path)}>
      <span className="workbench-sample-target__icon">
        <i aria-hidden className={`codicon ${target.icon}`} />
      </span>
      <span className="workbench-sample-target__body">
        {packageName ? (
          <span className="workbench-sample-target__package">{packageName}</span>
        ) : null}
        <span className="workbench-sample-target__label">{target.label}</span>
        <span className="workbench-sample-target__detail">{target.detail}</span>
        <span className="workbench-sample-target__tags">
          {target.tags.map((tag) => (
            <span key={tag} className="workbench-sample-target__tag">
              {tag}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

function SampleMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function createSampleStatusSections(theme: SampleTheme): StatusBarSectionModel[] {
  return [
    {
      id: 'sample-primary',
      items: [
        {
          icon: 'root-folder',
          id: 'sample.workspace',
          label: workspaceInfo.name,
          title: 'Sample workspace',
        },
        {
          active: true,
          icon: 'color-mode',
          id: 'sample.theme',
          label: `theme: ${theme}`,
          title: 'Toggle sample theme',
        },
      ],
    },
    {
      align: 'end',
      id: 'sample-meta',
      items: [
        {
          icon: 'files',
          id: 'sample.files',
          label: `${workspaceInfo.fileCount} files`,
          title: 'Virtual workspace files',
        },
        {
          icon: 'folder',
          id: 'sample.folders',
          label: `${workspaceInfo.folderCount} folders`,
          title: 'Virtual workspace folders',
        },
        {
          icon: 'extensions',
          id: 'sample.extensions',
          label: `${extensionsConfig.enabled.length} extensions`,
          title: 'Enabled built-in extensions',
        },
      ],
    },
  ];
}

function nextSampleTheme(theme: SampleTheme): SampleTheme {
  return theme === 'dark' ? 'light' : 'dark';
}
