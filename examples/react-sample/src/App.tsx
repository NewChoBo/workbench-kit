import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
  TextInput,
  Toolbar,
} from '@newchobo-ui/react';
import { ActivityBar, SplitView } from '@newchobo-ui/react/workbench';

type ThemeName = 'dark' | 'light';

const activityItems = [
  {
    id: 'components',
    label: 'Components',
    icon: <i className="codicon codicon-symbol-misc" />,
    active: true,
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: <i className="codicon codicon-layout" />,
  },
  {
    id: 'forms',
    label: 'Forms',
    icon: <i className="codicon codicon-settings-gear" />,
  },
];

const secondaryActivityItems = [
  {
    id: 'theme',
    label: 'Theme',
    icon: <i className="codicon codicon-color-mode" />,
  },
];

export function App() {
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [denseRows, setDenseRows] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <main className="ide-root sample-shell">
      <div className="ide-body">
        <ActivityBar items={activityItems} secondaryItems={secondaryActivityItems} />
        <aside className="workbench-primary-side-bar sample-sidebar">
          <SideBarViewFrame
            title="Newchobo UI"
            actions={<IconButton icon="codicon-refresh" label="Refresh" />}
            headerAddon={(
              <SideBarHeaderControl>
                <TextInput
                  aria-label="Filter components"
                  controlWidth="full"
                  placeholder="Filter"
                />
              </SideBarHeaderControl>
            )}
          >
            <SideBarList fill>
              <SideBarListItem active>Primitives</SideBarListItem>
              <SideBarListItem>Buttons</SideBarListItem>
              <SideBarListItem>Fields</SideBarListItem>
              <SideBarListItem>Panels</SideBarListItem>
              <SideBarListItem depth={1}>Split views</SideBarListItem>
              <SideBarListItem depth={1}>Dialogs</SideBarListItem>
              <SideBarListItem variant="stacked">
                <strong>Compact row</strong>
                <span>Secondary text remains contained.</span>
              </SideBarListItem>
            </SideBarList>
          </SideBarViewFrame>
        </aside>
        <section className="workbench-editor-area">
          <Panel>
            <PanelHeader
              actions={(
                <Toolbar>
                  <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </Button>
                  <Button variant="primary" onClick={() => setDialogOpen(true)}>
                    Open dialog
                  </Button>
                </Toolbar>
              )}
            >
              React Sample
            </PanelHeader>
            <PanelBody className="sample-editor-body">
              <SplitView
                defaultPrimarySizePercent={58}
                primary={<PreviewPane denseRows={denseRows} />}
                secondary={(
                  <ControlsPane
                    denseRows={denseRows}
                    onDenseRowsChange={setDenseRows}
                  />
                )}
              />
            </PanelBody>
          </Panel>
        </section>
      </div>
      {dialogOpen ? (
        <ConfirmDialog
          title="Confirm Action"
          message="This dialog is rendered by the shared React package."
          detail={<code>@newchobo-ui/react</code>}
          confirmLabel="Looks good"
          onCancel={() => setDialogOpen(false)}
          onConfirm={() => setDialogOpen(false)}
        />
      ) : null}
    </main>
  );
}

function PreviewPane({ denseRows }: { denseRows: boolean }) {
  return (
    <Panel className="sample-pane">
      <PanelHeader
        actions={(
          <Toolbar>
            <Badge>ready</Badge>
            <Badge variant="muted">react</Badge>
          </Toolbar>
        )}
      >
        Preview
      </PanelHeader>
      <PanelBody className="sample-preview">
        <section className="sample-hero">
          <div>
            <h1>Workbench primitives</h1>
            <p>Small controls, stable density, and panel-first composition.</p>
          </div>
          <IconButton icon="codicon-ellipsis" label="More actions" />
        </section>
        <div className="sample-card-grid">
          <div className="sample-card">
            <span className="sample-card__label">Button</span>
            <Button variant="primary">Primary</Button>
          </div>
          <div className="sample-card">
            <span className="sample-card__label">Badge</span>
            <Badge variant="danger">danger</Badge>
          </div>
          <div className="sample-card">
            <span className="sample-card__label">Input</span>
            <TextInput controlWidth="full" placeholder="Compact input" />
          </div>
        </div>
        <div className="sample-list" data-density={denseRows ? 'dense' : 'comfortable'}>
          {['Navigation row', 'Selection row', 'Scrollable content row', 'Action row'].map((item) => (
            <div key={item} className="sample-list__row">
              <i className="codicon codicon-file" />
              <span>{item}</span>
              <Badge variant="muted">item</Badge>
            </div>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}

function ControlsPane({
  denseRows,
  onDenseRowsChange,
}: {
  denseRows: boolean;
  onDenseRowsChange: (value: boolean) => void;
}) {
  return (
    <Panel className="sample-pane">
      <PanelHeader>Controls</PanelHeader>
      <PanelBody className="sample-controls">
        <Field label="Display density" description="A compact desktop rhythm for repeated rows.">
          <Select controlWidth="full" value={denseRows ? 'dense' : 'comfortable'} onChange={(event) => onDenseRowsChange(event.target.value === 'dense')}>
            <option value="dense">Dense</option>
            <option value="comfortable">Comfortable</option>
          </Select>
        </Field>
        <Field label="Field width" description="Inputs can fill their parent without local CSS.">
          <TextInput controlWidth="full" placeholder="Full width text field" />
        </Field>
        <Field inline label="Boolean setting">
          <Checkbox
            checked={denseRows}
            label="Use dense rows"
            onChange={(event) => onDenseRowsChange(event.currentTarget.checked)}
          />
        </Field>
        <div className="sample-empty-slot">
          <Panel>
            <PanelBody>
              <EmptyState icon="codicon-beaker">
                Reusable empty surfaces stay quiet and centered.
              </EmptyState>
            </PanelBody>
          </Panel>
        </div>
      </PanelBody>
    </Panel>
  );
}
