import type { Meta, StoryObj } from '@storybook/react-vite';
import type {
  UiComponentCatalogContract,
  UiComponentDescriptor,
  UiDesignSystemState,
} from '@workbench-kit/contracts';
import {
  applyUiAuthoringSessionCommandV3,
  createUiDocumentV3,
  formatWidgetDocumentJson,
  projectUiAuthoringDocumentV3,
  type UiAuthoringSessionStateV3,
  type UiDocumentCommandV3Context,
  type UiDocumentV3,
  type UiResponsiveEditingTarget,
} from '@workbench-kit/jdw';
import { createCommandRegistry } from '@workbench-kit/platform';
import {
  composeWorkbenchAuthoringProjectionV3,
  WorkbenchAuthoringCanvas,
  WorkbenchAuthoringInspector,
  type UiAuthoringSurfaceActionV3,
  type WorkbenchAuthoringControllerV3,
} from '@workbench-kit/react/authoring';
import { WorkbenchStandaloneShell } from '@workbench-kit/react/workbench/standalone';
import type { WorkbenchStandaloneBootstrap } from '@workbench-kit/react/workbench/standalone';
import { WorkbenchCommandHostController } from '@workbench-kit/shell-react/command-host-controller';
import type {
  UiAuthoringResolutionProjection,
  UiDesignSystemAuthoringChoiceProjection,
} from '@workbench-kit/workbench-core/design-system';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { expectVisibleChatBubbleText } from '../../../packages/react/src/workbench/story/chatStory';
import {
  expectCollapsedPrimarySidebarShowsFullWidthSecondary,
  expectExpandedPrimarySidebar,
} from '../../../packages/react/src/workbench/story/shellStory';
import { App } from './App.js';
import { createSampleHost } from './createSampleHost.js';
import { createSampleInstalledExtensionsStorageKey } from './sample-installed-extension-storage.js';
import {
  expectEditorTabVisible,
  expectSampleFileVisible,
  expectTesterActivityLabels,
  getActivityLabels,
  selectPermissionRole,
  waitForLoginGate,
  waitForWorkbenchReady,
} from './storybook/play/sampleHostAssertions.js';
import {
  applyBasicPermissionScopeScenario,
  applyDevtoolsInspectorsScenario,
  applyHostInstallStateScenario,
  applyLoginGateScenario,
  applyLoginSubmitScenario,
  applySidebarToggleScenario,
  applyTesterDevAppJourneyScenario,
  applyTesterWorkbenchScenario,
  applyFieldRemapEditorScenario,
  applyExtensionsInstalledListScenario,
  applyThemeSoftLifecycleScenario,
  applySettingsAppearanceScenario,
  applyCommandsActivityScenario,
} from './storybook/scenarios/index.js';
import './host.css';

const meta = {
  title: 'Workbench Sample/Dev App',
  component: App,
  parameters: {
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    test: {
      timeout: 60_000,
    },
  },
  /** Sample integration plays: required CI gate + sample-only filter tag. */
  tags: ['storybook-play-required', 'storybook-play-sample'],
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

const providerFreeCommandHostBootstrap = {
  contract: {
    activities: [{ id: 'home', label: 'Home' }],
    commandRegistry: createCommandRegistry([]),
    initialTheme: 'dark',
    statusSections: [],
  },
} satisfies WorkbenchStandaloneBootstrap<'home'>;

function ProviderFreeCommandHostStory() {
  const [lastExecution, setLastExecution] = useState('none');

  return (
    <WorkbenchStandaloneShell
      bootstrap={providerFreeCommandHostBootstrap}
      includeSettings={false}
      renderOverlays={() => (
        <WorkbenchCommandHostController
          commands={[{ id: 'story.command', label: 'Run standalone command' }]}
          executeCommand={(commandId, ...args) => {
            const path = (args[0] as { path?: unknown } | undefined)?.path;
            setLastExecution(typeof path === 'string' ? `${commandId}:${path}` : commandId);
          }}
          quickOpenProviders={[
            {
              id: 'story.files',
              label: 'Files',
              search: () => [
                {
                  data: { path: 'docs/standalone.md' },
                  id: 'docs/standalone.md',
                  label: 'standalone.md',
                },
              ],
            },
          ]}
        />
      )}
      renderPrimarySidebar={() => <aside>Standalone navigation</aside>}
      renderSecondaryArea={() => (
        <main aria-label="Standalone command host">
          <p>Provider-free controller mounted.</p>
          <output aria-label="Last standalone command">{lastExecution}</output>
        </main>
      )}
    />
  );
}

export const ProviderFreeCommandHost: Story = {
  name: 'Provider-free command host',
  render: () => <ProviderFreeCommandHostStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Standalone command host')).toBeVisible();
    await userEvent.keyboard('{Control>}{Shift>}p{/Control}{/Shift}');
    const palette = await canvas.findByRole('dialog', { name: /Command Palette/ });
    await expect(
      within(palette).getByRole('option', { name: /Run standalone command/ }),
    ).toBeVisible();

    await userEvent.keyboard('{Control>}p{/Control}');
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: /Command Palette/ })).toBeNull(),
    );
    const quickOpen = await canvas.findByRole('dialog', { name: /Quick Open/ });
    const file = await within(quickOpen).findByRole('option', { name: /standalone\.md/ });
    within(quickOpen).getByLabelText('Search files by name').focus();
    await waitFor(() => expect(file).toHaveAttribute('aria-selected', 'true'));
    await userEvent.keyboard('{Enter}');

    await expect(canvas.getByLabelText('Last standalone command')).toHaveTextContent(
      'workspace.open:docs/standalone.md',
    );
  },
};

const AUTHORING_COMPONENT = Object.freeze<UiComponentDescriptor>({
  id: 'workbench-neutral:card',
  version: '1.0.0',
  kind: 'atomic',
  properties: Object.freeze([
    Object.freeze({ id: 'title', label: 'Title', value: Object.freeze({ type: 'string' }) }),
  ]),
  layout: Object.freeze({
    supportedStrategyIds: Object.freeze(['canvas']),
    defaultStrategyId: 'canvas',
  }),
  designTime: Object.freeze({ label: 'Card' }),
});

const AUTHORING_COMPONENT_CATALOG = Object.freeze<UiComponentCatalogContract>({
  component: (ref) =>
    ref.id === AUTHORING_COMPONENT.id && ref.version === AUTHORING_COMPONENT.version
      ? AUTHORING_COMPONENT
      : undefined,
  components: () => Object.freeze([AUTHORING_COMPONENT]),
});

const AUTHORING_COMMAND_CONTEXT = Object.freeze<UiDocumentCommandV3Context>({
  componentCatalog: AUTHORING_COMPONENT_CATALOG,
  layoutStrategies: Object.freeze([
    Object.freeze({
      id: 'canvas',
      kind: 'canvas',
      label: 'Canvas',
      supportedContainerProperties: Object.freeze(['width']),
      supportedChildProperties: Object.freeze([]),
    }),
  ]),
  layoutProperties: Object.freeze([
    Object.freeze({
      id: 'width',
      label: 'Width',
      scope: 'container',
      group: 'sizing',
      strategyKinds: Object.freeze(['canvas']),
      value: Object.freeze({ type: 'layout.dimension' }),
    }),
  ]),
});

const authoringPx = (value: number) =>
  Object.freeze({
    kind: 'literal' as const,
    value: Object.freeze({ kind: 'length' as const, value, unit: 'px' as const }),
  });

const AUTHORING_DESIGN_SYSTEM = Object.freeze<UiDesignSystemState>({
  pack: Object.freeze({ id: 'workbench-neutral', version: '1.0.0' }),
  theme: Object.freeze({
    pack: Object.freeze({ id: 'workbench-neutral', version: '1.0.0' }),
    themeId: 'night',
  }),
});

const AUTHORING_ROOT = Object.freeze({
  type: 'text',
  id: 'hero-card',
  text: 'Provider-free responsive authoring',
  $authoring: Object.freeze({
    documentSchemaVersion: 2,
    component: Object.freeze({
      id: AUTHORING_COMPONENT.id,
      version: AUTHORING_COMPONENT.version,
    }),
    properties: Object.freeze({
      title: Object.freeze({ kind: 'literal', value: 'Base workspace' }),
    }),
    layout: Object.freeze({
      strategyId: 'canvas',
      values: Object.freeze({ width: authoringPx(560) }),
    }),
    designSystem: AUTHORING_DESIGN_SYSTEM,
    responsiveVariants: Object.freeze([
      Object.freeze({ id: 'narrow', hostWidth: Object.freeze({ maxExclusive: 520 }) }),
      Object.freeze({
        id: 'medium',
        hostWidth: Object.freeze({ minInclusive: 520, maxExclusive: 900 }),
      }),
      Object.freeze({ id: 'wide', hostWidth: Object.freeze({ minInclusive: 900 }) }),
    ]),
    responsiveOverrides: Object.freeze({
      wide: Object.freeze({
        properties: Object.freeze({
          title: Object.freeze({ kind: 'literal', value: 'Wide workspace' }),
        }),
        layout: Object.freeze({
          strategyId: 'canvas',
          values: Object.freeze({ width: authoringPx(760) }),
        }),
      }),
      medium: Object.freeze({
        properties: Object.freeze({
          title: Object.freeze({ kind: 'literal', value: 'Medium workspace' }),
        }),
        layout: Object.freeze({
          strategyId: 'canvas',
          values: Object.freeze({ width: authoringPx(520) }),
        }),
      }),
      narrow: Object.freeze({
        properties: Object.freeze({
          title: Object.freeze({ kind: 'literal', value: 'Compact workspace' }),
        }),
        layout: Object.freeze({
          strategyId: 'canvas',
          values: Object.freeze({ width: authoringPx(320) }),
        }),
      }),
    }),
  }),
});

const AUTHORING_DOCUMENT_RESULT = createUiDocumentV3(
  'provider-free-authoring',
  formatWidgetDocumentJson(AUTHORING_ROOT),
);
if (AUTHORING_DOCUMENT_RESULT.document === null) {
  throw new TypeError(
    AUTHORING_DOCUMENT_RESULT.issues[0]?.message ?? 'Authoring Story document is invalid.',
  );
}
const AUTHORING_DOCUMENT = Object.freeze<UiDocumentV3>({
  ...AUTHORING_DOCUMENT_RESULT.document,
  revision: 7,
});

const AUTHORING_SESSION = Object.freeze<UiAuthoringSessionStateV3>({
  document: AUTHORING_DOCUMENT,
  selectedNodeIds: Object.freeze(['hero-card']),
  past: Object.freeze([]),
  future: Object.freeze([]),
});

const AUTHORING_CHOICES = Object.freeze<UiDesignSystemAuthoringChoiceProjection>({
  registryRevision: 11,
  state: AUTHORING_DESIGN_SYSTEM,
  packs: Object.freeze([
    Object.freeze({
      ref: AUTHORING_DESIGN_SYSTEM.pack,
      displayName: 'Workbench Neutral',
      themes: Object.freeze([
        Object.freeze({ ref: AUTHORING_DESIGN_SYSTEM.theme, displayName: 'Night' }),
        Object.freeze({
          ref: Object.freeze({
            pack: AUTHORING_DESIGN_SYSTEM.pack,
            themeId: 'day',
          }),
          displayName: 'Day',
        }),
      ]),
    }),
    Object.freeze({
      ref: Object.freeze({ id: 'workbench-contrast', version: '1.0.0' }),
      displayName: 'Workbench Contrast',
      themes: Object.freeze([
        Object.freeze({
          ref: Object.freeze({
            pack: Object.freeze({ id: 'workbench-contrast', version: '1.0.0' }),
            themeId: 'high-contrast',
          }),
          displayName: 'High Contrast',
        }),
      ]),
    }),
  ]),
  diagnostics: Object.freeze([]),
});

function createAuthoringResolution(
  authoredDocument: UiDocumentV3,
  previewHostWidth: number,
  activeResponsiveVariantId: string | undefined,
  title: string,
): UiAuthoringResolutionProjection {
  const component = { id: AUTHORING_COMPONENT.id, version: AUTHORING_COMPONENT.version };
  return {
    documentId: authoredDocument.documentId,
    documentRevision: authoredDocument.revision,
    registryRevision: AUTHORING_CHOICES.registryRevision,
    hostWidth: previewHostWidth,
    ...(activeResponsiveVariantId === undefined ? {} : { activeResponsiveVariantId }),
    nodes: [
      {
        nodeId: 'hero-card',
        component,
        componentCompatibility: { kind: 'direct', source: component, target: component },
        componentProvenance: {
          source: 'builtin',
          sourceId: 'workbench-neutral',
          sourceVersion: '1.0.0',
        },
        effectiveTheme: AUTHORING_DESIGN_SYSTEM.theme,
        scopeChain: [],
        properties: {
          title: {
            value: {
              valueType: 'string',
              source: { kind: 'literal', value: title },
              provenance: [{ kind: 'theme', sourceId: 'night', tokenId: 'title' }],
            },
            diagnostics: [],
          },
        },
        diagnostics: [],
      },
    ],
    diagnostics: [],
  };
}

function AuthoringStoryHarness({
  initialEditingTarget,
  initialWidth,
  showDiagnostic = false,
}: {
  initialEditingTarget: UiResponsiveEditingTarget;
  initialWidth: number;
  showDiagnostic?: boolean;
}) {
  const [previewHostWidth, setPreviewHostWidth] = useState(initialWidth);
  const [editingTarget, setEditingTarget] = useState(initialEditingTarget);
  const [session, setSession] = useState(AUTHORING_SESSION);
  const [lastAction, setLastAction] = useState<UiAuthoringSurfaceActionV3 | null>(null);
  const document = projectUiAuthoringDocumentV3(session, AUTHORING_COMMAND_CONTEXT, {
    previewHostWidth,
    editingTarget,
  });
  const titleProjection = document.nodes[0]?.properties.title;
  const title =
    titleProjection?.value.kind === 'literal' && typeof titleProjection.value.value === 'string'
      ? titleProjection.value.value
      : 'Unresolved title';
  const choices: UiDesignSystemAuthoringChoiceProjection = showDiagnostic
    ? {
        ...AUTHORING_CHOICES,
        diagnostics: [
          {
            code: 'theme-not-found',
            message: 'Story diagnostic: a fallback Theme would be required.',
            path: 'state.theme.themeId',
            packId: 'workbench-neutral',
            requestedVersion: '1.0.0',
            themeId: 'missing',
          },
        ],
      }
    : AUTHORING_CHOICES;
  const projection = composeWorkbenchAuthoringProjectionV3(
    createAuthoringResolution(
      session.document,
      previewHostWidth,
      document.activeResponsiveVariantId,
      title,
    ),
    document,
    choices,
  );
  const controller: WorkbenchAuthoringControllerV3 = {
    projection,
    dispatch: (action) => {
      setLastAction(action);
      if (action.kind === 'document-command-v3') {
        setSession(
          (current) =>
            applyUiAuthoringSessionCommandV3(current, action.command, AUTHORING_COMMAND_CONTEXT)
              .state,
        );
      }
    },
    setPreviewHostWidth,
    setEditingTarget,
  };
  const stacked = previewHostWidth < 520;

  return (
    <div
      data-authoring-story-layout={stacked ? 'stacked' : 'split'}
      style={{
        display: 'grid',
        gridTemplateColumns: stacked ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 320px',
        gridTemplateRows: stacked ? '560px minmax(360px, auto)' : 'minmax(560px, 1fr)',
        gap: 12,
        minHeight: 720,
      }}
    >
      <WorkbenchAuthoringCanvas controller={controller} />
      <WorkbenchAuthoringInspector controller={controller} />
      <output className="ui-visually-hidden" data-testid="last-authoring-action">
        {lastAction === null ? 'none' : JSON.stringify(lastAction)}
      </output>
      <output className="ui-visually-hidden" data-testid="authoring-document-revision">
        {session.document.revision}
      </output>
      <output className="ui-visually-hidden" data-testid="authoring-history-count">
        {session.past.length}
      </output>
    </div>
  );
}

async function verifyAuthoringViewport(
  canvasElement: HTMLElement,
  expected: { width: number; variantId: string },
) {
  const canvas = within(canvasElement);
  const canvasSurface = canvas.getByLabelText('Authoring Canvas');
  await expect(canvasSurface).toHaveAttribute('data-preview-host-width', String(expected.width));
  await expect(canvasSurface).toHaveAttribute('data-active-variant', expected.variantId);
  await expect(canvas.getByTestId('authoring-target-status')).toHaveTextContent(
    `Active: Variant ${expected.variantId} · Editing: Variant ${expected.variantId}`,
  );
  await expect(canvas.getByLabelText('Design System Pack')).toBeDisabled();
  await expect(canvas.getByLabelText('Design System Theme')).toBeDisabled();
  await expect(canvas.getByLabelText('Available Design System choices')).toHaveTextContent(
    'Workbench Neutral',
  );
  await expect(canvas.getByLabelText('Available Design System choices')).toHaveTextContent('Day');
  await expect(canvas.getByLabelText('Available Design System choices')).toHaveTextContent(
    'Workbench Contrast',
  );
  await expect(canvas.getByLabelText('Available Design System choices')).toHaveTextContent(
    'High Contrast',
  );

  const viewport = canvasElement.querySelector<HTMLElement>(
    '.ui-workbench-preview-canvas__viewport',
  );
  if (!viewport) throw new Error('Authoring preview viewport did not render.');
  await waitFor(() =>
    expect(Math.round(viewport.getBoundingClientRect().width)).toBe(expected.width),
  );

  const layoutActions = canvas.getAllByRole('button', {
    name: 'Override layout with effective',
  });
  await userEvent.click(layoutActions[0]!);
  const pointerAction = canvas.getByTestId('last-authoring-action').textContent;
  canvas.getAllByRole('button', { name: 'Override layout with effective' })[1]!.focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() =>
    expect(canvas.getByTestId('last-authoring-action').textContent).toBe(pointerAction),
  );
  await expect(canvas.getByTestId('authoring-history-count')).toHaveTextContent('0');

  await userEvent.click(canvas.getByRole('button', { name: 'Clear layout override' }));
  await expect(canvas.getByTestId('authoring-history-count')).toHaveTextContent('1');
  await expect(canvas.getByTestId('authoring-document-revision')).toHaveTextContent('8');
  await expect(canvas.getByText('Provenance').parentElement!).toHaveTextContent('Base');

  await userEvent.click(
    canvas.getAllByRole('button', { name: 'Override layout with effective' })[0]!,
  );
  await waitFor(() => {
    expect(canvas.getByTestId('authoring-history-count')).toHaveTextContent('2');
    expect(canvas.getByTestId('authoring-document-revision')).toHaveTextContent('9');
  });
}

export const AuthoringWide: Story = {
  name: 'Authoring / Wide',
  render: () => (
    <AuthoringStoryHarness
      initialEditingTarget={{ kind: 'variant', variantId: 'wide' }}
      initialWidth={900}
    />
  ),
  play: async ({ canvasElement }) =>
    verifyAuthoringViewport(canvasElement, { width: 900, variantId: 'wide' }),
};

export const AuthoringMedium: Story = {
  name: 'Authoring / Medium',
  render: () => (
    <AuthoringStoryHarness
      initialEditingTarget={{ kind: 'variant', variantId: 'medium' }}
      initialWidth={640}
    />
  ),
  play: async ({ canvasElement }) =>
    verifyAuthoringViewport(canvasElement, { width: 640, variantId: 'medium' }),
};

export const AuthoringNarrow: Story = {
  name: 'Authoring / Narrow',
  render: () => (
    <AuthoringStoryHarness
      initialEditingTarget={{ kind: 'variant', variantId: 'narrow' }}
      initialWidth={360}
    />
  ),
  play: async ({ canvasElement }) =>
    verifyAuthoringViewport(canvasElement, { width: 360, variantId: 'narrow' }),
};

export const AuthoringCrossWidth: Story = {
  name: 'Authoring / Cross-width target lock',
  render: () => (
    <AuthoringStoryHarness
      initialEditingTarget={{ kind: 'variant', variantId: 'wide' }}
      initialWidth={900}
      showDiagnostic
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const width = canvas.getByLabelText('Preview width');
    await userEvent.click(width);
    await userEvent.keyboard('{Control>}a{/Control}360');
    await expect(width).toHaveValue(360);
    await waitFor(() =>
      expect(canvas.getByTestId('authoring-target-status')).toHaveTextContent(
        'Active: Variant narrow · Editing: Variant wide',
      ),
    );
    await expect(
      canvas.getAllByRole('button', { name: 'Override layout with effective' })[0],
    ).toBeDisabled();
    await expect(canvas.getAllByRole('alert')[0]).toHaveTextContent('Story diagnostic');
    await userEvent.click(canvas.getByRole('button', { name: 'Edit active' }));
    const canvasMutation = canvas.getAllByRole('button', {
      name: 'Override layout with effective',
    })[0]!;
    await expect(canvasMutation).toBeEnabled();
    await expect(canvasMutation).toHaveFocus();
    await expect(canvas.getByTestId('authoring-target-status')).toHaveTextContent(
      'Active: Variant narrow · Editing: Variant narrow',
    );
  },
};

export const LoginGate: Story = {
  name: 'Login gate',
  render: () => {
    applyLoginGateScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for session bootstrap to settle before asserting — avoids test-runner
    // navigation retries when the gate remounts during "Checking sample session...".
    await waitForLoginGate(canvas);
    await expect(canvas.getByText('Workbench Sample')).toBeVisible();
    await expect(canvas.getByLabelText('Username')).toHaveAttribute(
      'placeholder',
      'tester or basic',
    );
    await expect(canvas.getByLabelText('Password')).toHaveAttribute(
      'placeholder',
      'Enter password',
    );
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(canvas.getByText(/Administrator: tester\/tester/)).toBeVisible();
  },
};

export const LoginSubmitFlow: Story = {
  name: 'Login submit flow',
  render: () => {
    applyLoginSubmitScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForLoginGate(canvas);

    const username = canvas.getByLabelText('Username');
    const password = canvas.getByLabelText('Password');
    const signIn = canvas.getByRole('button', { name: 'Sign in' });

    await userEvent.type(username, 'wrong');
    await userEvent.type(password, 'wrong');
    await userEvent.click(signIn);
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    );

    await userEvent.clear(username);
    await userEvent.clear(password);
    await userEvent.type(username, 'tester');
    await userEvent.type(password, 'tester');
    await userEvent.click(signIn);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Open example' })).toBeVisible();
    expectTesterActivityLabels(canvas);
  },
};

export const TesterWorkbench: Story = {
  name: 'Tester workbench',
  render: () => {
    applyTesterWorkbenchScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    await expect(canvas.getByLabelText('Status bar')).toHaveTextContent('Workbench Kit');
    await expect(canvas.getByRole('button', { name: 'Open example' })).toBeVisible();

    expectTesterActivityLabels(canvas);
  },
};

export const DevtoolsInspectors: Story = {
  name: 'Devtools inspectors',
  render: () => {
    applyDevtoolsInspectorsScenario();
    return createSampleHost({ devtools: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    const devtools = await canvas.findByLabelText('Workbench devtools');
    const devtoolsScope = within(devtools);
    await expect(devtoolsScope.getByText('Workbench Devtools')).toBeVisible();
    await expect(devtoolsScope.getByText('Read-only')).toBeVisible();
    await expect(devtoolsScope.getByRole('button', { name: 'Commands' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(devtools).toHaveTextContent('workbench-kit.builtin.settings.open');
    await expect(devtools).toHaveTextContent('workspace.open');

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Transactions' }));
    await expect(devtools).toHaveTextContent('Initialize workspace');

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Layout' }));
    await expect(devtools).toHaveTextContent('"activeViewContainer": "explorer"');

    await userEvent.click(canvas.getByRole('button', { name: 'Open example' }));
    await expectEditorTabVisible(canvas, 'example.jdw.json');
    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Editor' }));
    await expect(devtools).toHaveTextContent('example.jdw.json');

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(settingsDialog).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: /Settings/ })).toBeNull());

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Capabilities' }));
    await expect(devtools).toHaveTextContent('workbench-kit.builtin.settings');
    await expect(devtools).toHaveTextContent('workbench.settings');
  },
};

export const HostInstallState: Story = {
  name: 'Host install state',
  render: () => {
    applyHostInstallStateScenario();
    return createSampleHost({ devtools: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    const devtools = await canvas.findByLabelText('Workbench devtools');
    const devtoolsScope = within(devtools);

    await userEvent.click(devtoolsScope.getByRole('button', { name: 'Capabilities' }));
    await expect(devtools).toHaveTextContent('workbench-kit.samples.json-preview');
    expect(
      window.localStorage.getItem(createSampleInstalledExtensionsStorageKey('tester')),
    ).toContain('workbench-kit.samples.json-preview');
  },
};

export const TesterDevAppJourney: Story = {
  name: 'Tester dev app journey',
  render: () => {
    applyTesterDevAppJourneyScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByText('Workbench Sample')).toBeVisible();
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();
    await expect(canvas.getByLabelText('Editor area')).toBeVisible();
    await expectSampleFileVisible(canvas, 'showcase');
    await expectSampleFileVisible(canvas, 'example.jdw.json');
    await userEvent.click(canvas.getByRole('button', { name: 'Open example' }));
    await expectEditorTabVisible(canvas, 'example.jdw.json');

    await userEvent.click(canvas.getByRole('button', { name: 'Search' }));
    const searchPanel = await canvas.findByLabelText('Workspace Search');
    await expect(searchPanel).toBeVisible();
    const searchScope = within(searchPanel);
    const searchInput = searchScope.getByLabelText('Search workspace');
    await userEvent.type(searchInput, 'button');
    await waitFor(() => {
      expect(searchScope.getByRole('list', { name: 'Search results' })).toHaveTextContent(
        'Button.tsx',
      );
    });
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'Button.tsx');

    await userEvent.keyboard('{Control>}p{/Control}');
    const quickOpen = await canvas.findByRole('dialog', { name: /Quick Open/ });
    await expect(quickOpen).toBeVisible();
    const quickOpenSearch = within(quickOpen).getByLabelText('Search files by name');
    // Quick Open search uses pointer-events:none; drive input via focus + keyboard.
    quickOpenSearch.focus();
    await userEvent.keyboard('README');
    await waitFor(() => {
      expect(quickOpenSearch).toHaveValue('README');
    });
    // Empty-query results already include README.md — wait until the filtered
    // option is active, not merely present in the listbox text.
    await waitFor(() => {
      expect(within(quickOpen).getByRole('option', { name: /README\.md/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
    await userEvent.keyboard('{Enter}');
    await expectEditorTabVisible(canvas, 'README.md');

    await userEvent.keyboard('{Control>}{Shift>}p{/Control}{/Shift}');
    const commandPalette = await canvas.findByRole('dialog', { name: /Command Palette/ });
    await expect(commandPalette).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(canvas.getByRole('button', { name: 'Chat' }));
    await expectVisibleChatBubbleText(canvas, 'Share updates here while working in the workspace.');

    const chatComposer = canvas.getByPlaceholderText('Message your team');
    await userEvent.type(chatComposer, 'Storybook chat smoke');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Storybook chat smoke');
    await expect(chatComposer).toHaveValue('');

    await userEvent.type(chatComposer, 'Follow-up from Storybook');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Follow-up from Storybook');

    await userEvent.click(canvas.getByRole('button', { name: 'AI Chat' }));
    const aiChatInput = await canvas.findByPlaceholderText('Ask about this workspace');
    await expect(aiChatInput).toBeVisible();
    await userEvent.type(aiChatInput, 'show explorer');
    await expect(aiChatInput).toHaveValue('show explorer');
    const aiComposer = aiChatInput.closest('.composer');
    expect(aiComposer).not.toBeNull();
    await expect(
      within(aiComposer as HTMLElement).getByRole('button', { name: 'Show commands' }),
    ).toBeVisible();
    await userEvent.clear(aiChatInput);
    await expect(aiChatInput).toHaveValue('');

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(settingsDialog).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Linked Accounts' }));
    await expect(within(settingsDialog).getByText('GitHub Project Access')).toBeVisible();
    await expect(within(settingsDialog).getByText('CI Package Registry')).toBeVisible();
    await userEvent.click(
      within(settingsDialog).getByRole('button', { name: 'Permissions (demo)' }),
    );
    await expect(
      within(settingsDialog).getByRole('combobox', { name: 'Permission role (demo)' }),
    ).toHaveTextContent('Use sign-in role');
    await expect(within(settingsDialog).getByText(/Effective role: Owner/)).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: /Settings/ })).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'Profile' }));
    const profileDialog = await canvas.findByRole('dialog', { name: /Profile/ });
    await expect(within(profileDialog).getByText('tester@workbench-sample.local')).toBeVisible();
    await selectPermissionRole(profileDialog, 'Viewer');
    await waitFor(() => {
      expect(getActivityLabels(canvas)).toEqual(['Explorer', 'Profile']);
    });
    await selectPermissionRole(profileDialog, 'Owner');
    await waitFor(() => {
      expectTesterActivityLabels(canvas);
    });
    await userEvent.click(within(profileDialog).getByRole('button', { name: 'Sign out' }));
    await waitForLoginGate(canvas);
  },
};

export const BasicPermissionScope: Story = {
  name: 'Basic permission scope',
  render: () => {
    applyBasicPermissionScopeScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);

    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    expect(getActivityLabels(canvas)).toEqual(['Explorer', 'Profile']);
    await expect(canvas.queryByRole('button', { name: 'Search' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Settings' })).toBeNull();

    await userEvent.keyboard('{Control>}{Shift>}p{/Control}{/Shift}');
    const commandPalette = await canvas.findByRole('dialog', { name: /Command Palette/ });
    const commandSearch = within(commandPalette).getByPlaceholderText('Search commands');
    // Command palette search uses pointer-events:none; drive input via focus + keyboard.
    commandSearch.focus();
    await userEvent.keyboard('Permission Role (Demo)');
    await waitFor(() => {
      expect(commandSearch).toHaveValue('>Permission Role (Demo)');
      expect(
        within(commandPalette).getByRole('option', { name: /Permission Role \(Demo\)/ }),
      ).toHaveAttribute('aria-selected', 'true');
    });
    await userEvent.keyboard('{Enter}');

    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(
      within(settingsDialog).getByRole('combobox', { name: 'Permission role (demo)' }),
    ).toBeVisible();
  },
};

export const SidebarToggle: Story = {
  name: 'Sidebar toggle',
  render: () => {
    applySidebarToggleScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBeGreaterThan(0);

    const hideStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle(/Hide primary sidebar/));
    await waitFor(() => {
      expectCollapsedPrimarySidebarShowsFullWidthSecondary(canvasElement);
    });
    const hideDurationMs = performance.now() - hideStartedAt;

    expect(canvasElement.querySelectorAll('.ui-workbench-split-view').length).toBeGreaterThan(0);
    expect(canvas.getByLabelText('Workspace Explorer')).not.toBeVisible();
    await expect(canvas.getByLabelText('Sample editor workspace')).toBeVisible();

    const showStartedAt = performance.now();
    await userEvent.click(canvas.getByTitle('Show primary sidebar'));
    await waitFor(() => {
      expect(canvas.getByLabelText('Workspace Explorer')).toBeVisible();
    });
    const showDurationMs = performance.now() - showStartedAt;

    expectExpandedPrimarySidebar(canvasElement);
    expect(hideDurationMs).toBeLessThan(2_000);
    expect(showDurationMs).toBeLessThan(2_000);
  },
};

export const FieldRemapEditorSmoke: Story = {
  name: 'Field Remap editor smoke',
  render: () => {
    applyFieldRemapEditorScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Field Remap' }));

    const sampleList = await canvas.findByLabelText('Field remap samples');
    await expect(sampleList).toBeVisible();
    await userEvent.click(canvas.getByTestId('field-remap-open-nested-ab'));

    await expectEditorTabVisible(canvas, 'A → B');
    await waitFor(() => {
      expect(canvas.getByTestId('field-remap-editor-surface')).toBeVisible();
    });
    await expect(canvas.getByTestId('field-remap-demo')).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 2, name: 'A → B' })).toBeVisible();
    await expect(canvas.getByTestId('field-remap-result')).not.toHaveTextContent(/^$/);
    await expect(canvas.getByTestId('field-remap-result')).toHaveTextContent('Ada Lovelace');
  },
};

export const ExtensionsInstalledList: Story = {
  name: 'Extensions installed list',
  tags: ['storybook-play-extension-management'],
  render: () => {
    applyExtensionsInstalledListScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Extensions' }));

    const listSwitcher = await canvas.findByLabelText('Extension lists');
    await userEvent.click(within(listSwitcher).getByRole('button', { name: 'Installed' }));

    const installedList = await canvas.findByLabelText('Installed extensions');
    await expect(installedList).toBeVisible();
    await expect(
      within(installedList).getByText('JSON Preview', {
        selector: '.workbench-extensions-sidebar__title',
      }),
    ).toBeVisible();
    const jsonPreviewRow = within(installedList)
      .getByText('JSON Preview', { selector: '.workbench-extensions-sidebar__title' })
      .closest('.workbench-extensions-sidebar__item');
    const explorerRow = within(installedList)
      .getByText('Explorer', { selector: '.workbench-extensions-sidebar__title' })
      .closest('.workbench-extensions-sidebar__item');
    expect(jsonPreviewRow).not.toBeNull();
    expect(explorerRow).not.toBeNull();
    await expect(
      within(jsonPreviewRow as HTMLElement).getByRole('button', { name: 'Uninstall' }),
    ).toBeVisible();
    expect(
      within(explorerRow as HTMLElement).queryByRole('button', { name: 'Uninstall' }),
    ).toBeNull();
    expect(within(installedList).getAllByRole('button', { name: 'Uninstall' })).toHaveLength(1);
  },
};

export const SettingsAppearanceSmoke: Story = {
  name: 'Settings appearance smoke',
  render: () => {
    applySettingsAppearanceScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    const shellRoot = canvasElement.querySelector<HTMLElement>('.ide-root');
    const editorRegion = canvasElement.querySelector<HTMLElement>('.workbench-sample-editor-frame');
    const activityBar = canvasElement.querySelector<HTMLElement>('.ui-workbench-activity-bar');
    expect(shellRoot).not.toBeNull();
    expect(editorRegion).not.toBeNull();
    expect(activityBar).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));

    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await expect(settingsDialog).toBeVisible();
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Appearance' }));
    await expect(
      within(settingsDialog).getByRole('combobox', { name: 'Color scheme' }),
    ).toBeVisible();
    await expect(within(settingsDialog).getByRole('heading', { name: 'Appearance' })).toBeVisible();

    const colorSchemeSelect = within(settingsDialog).getByRole('combobox', {
      name: 'Color scheme',
    });
    await userEvent.click(colorSchemeSelect);
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole('option', { name: 'Dark' }),
    );

    const darkThemeSelect = within(settingsDialog).getByRole('combobox', {
      name: 'Preferred Dark Color Theme',
    });
    await userEvent.click(darkThemeSelect);
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole('option', {
        name: 'Sample Forest',
      }),
    );

    await waitFor(() => {
      expect(shellRoot).toHaveAttribute('data-theme', 'dark');
      expect(shellRoot).toHaveAttribute('data-theme-preset', 'workbench-kit.sample.host.forest');
      expect(shellRoot?.style.getPropertyValue('--color-bg')).toBe('#0f1a12');
      expect(canvasElement.ownerDocument.documentElement.style.getPropertyValue('--color-bg')).toBe(
        '#0f1a12',
      );
      expect(getComputedStyle(editorRegion!).getPropertyValue('--color-bg')).toBe('#0f1a12');
      expect(getComputedStyle(activityBar!).getPropertyValue('--color-bg')).toBe('#0f1a12');
    });
    await expect(darkThemeSelect).toHaveFocus();

    await userEvent.click(darkThemeSelect);
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole('option', { name: 'Deep Navy' }),
    );
    await waitFor(() => {
      expect(canvasElement.querySelector('.ide-root')).toBe(shellRoot);
      expect(shellRoot).toHaveAttribute('data-theme-preset', 'navy');
      expect(shellRoot?.style.getPropertyValue('--color-bg')).toBe('');
      expect(canvasElement.ownerDocument.documentElement.style.getPropertyValue('--color-bg')).toBe(
        '',
      );
    });
  },
};

export const ThemeSoftLifecycle: Story = {
  name: 'Theme soft lifecycle',
  tags: ['storybook-play-extension-management'],
  render: () => {
    applyThemeSoftLifecycleScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Extensions' }));
    const listSwitcher = await canvas.findByLabelText('Extension lists');
    await userEvent.click(within(listSwitcher).getByRole('button', { name: 'Installed' }));
    const installedList = await canvas.findByLabelText('Installed extensions');
    const themeRow = within(installedList)
      .getByText('Alternate Theme Pack', { selector: '.workbench-extensions-sidebar__title' })
      .closest('.workbench-extensions-sidebar__item');
    expect(themeRow).not.toBeNull();

    await userEvent.click(within(themeRow as HTMLElement).getByRole('button', { name: 'Enable' }));
    await expect(within(themeRow as HTMLElement).getByText('Applied')).toBeVisible();
    await expect(
      within(themeRow as HTMLElement).getByRole('button', { name: 'Disable' }),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Appearance' }));
    const darkThemeSelect = within(settingsDialog).getByRole('combobox', {
      name: 'Preferred Dark Color Theme',
    });
    await userEvent.click(darkThemeSelect);
    const documentCanvas = within(canvasElement.ownerDocument.body);
    await expect(
      await documentCanvas.findByRole('option', { name: 'Dark Blue Alt' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(within(settingsDialog).getByRole('button', { name: 'Close' }));

    const restoredListSwitcher = await canvas.findByRole('group', { name: 'Extension lists' });
    await userEvent.click(within(restoredListSwitcher).getByRole('button', { name: 'Installed' }));
    const restoredInstalledList = await canvas.findByRole('list', {
      name: 'Installed extensions',
    });
    const restoredThemeRow = within(restoredInstalledList)
      .getByText('Alternate Theme Pack', { selector: '.workbench-extensions-sidebar__title' })
      .closest('.workbench-extensions-sidebar__item');
    expect(restoredThemeRow).not.toBeNull();
    await userEvent.click(
      within(restoredThemeRow as HTMLElement).getByRole('button', { name: 'Disable' }),
    );
    await expect(within(restoredThemeRow as HTMLElement).getByText('Applied')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    const restoredSettingsDialog = await canvas.findByRole('dialog', { name: /Settings/ });
    await userEvent.click(
      within(restoredSettingsDialog).getByRole('button', { name: 'Appearance' }),
    );
    const restoredDarkThemeSelect = within(restoredSettingsDialog).getByRole('combobox', {
      name: 'Preferred Dark Color Theme',
    });
    await userEvent.click(restoredDarkThemeSelect);
    expect(documentCanvas.queryByRole('option', { name: 'Dark Blue Alt' })).toBeNull();
  },
};

export const CommandsActivitySmoke: Story = {
  name: 'Commands activity smoke',
  render: () => {
    applyCommandsActivityScenario();
    return createSampleHost();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitForWorkbenchReady(canvas);
    const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
    await userEvent.click(within(activityBar).getByRole('button', { name: 'Commands' }));

    await expect(await canvas.findByLabelText('Filter commands')).toBeVisible();
  },
};
