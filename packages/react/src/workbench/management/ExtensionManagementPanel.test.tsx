import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExtensionManagementPanel } from './ExtensionManagementPanel';
import { ExtensionManagementSidebar } from './ExtensionManagementSidebar';

describe('ExtensionManagementPanel', () => {
  it('renders installed extension feature summaries', () => {
    const markup = renderToStaticMarkup(
      createElement(ExtensionManagementPanel, {
        browseEntries: [],
        installedEntries: [
          {
            category: 'builtin',
            description: 'Explorer',
            diagnostics: [
              {
                message: 'Capability "workbench.workspace" is missing.',
                severity: 'warning',
              },
            ],
            displayName: 'Explorer',
            enabled: true,
            features: {
              capabilities: {
                provides: [],
                requires: ['workbench.workspace'],
              },
              commands: [
                {
                  id: 'workbench-kit.builtin.explorer.refresh',
                  label: 'Refresh Explorer',
                },
              ],
              documentViews: [
                {
                  id: 'workbench-kit.builtin.editor.preview',
                  label: 'Editor Preview',
                },
              ],
              menus: [
                {
                  id: 'view/title:workbench-kit.builtin.explorer.refresh',
                  label: 'view/title: Refresh Explorer',
                },
              ],
              permissions: ['workspace.read'],
              settings: [
                {
                  id: 'workbench.explorer.compactFolders',
                  label: 'workbench.explorer.compactFolders',
                },
              ],
              views: [
                {
                  id: 'workbench-kit.builtin.explorer.tree',
                  label: 'Explorer',
                },
              ],
            },
            id: 'workbench-kit.builtin.explorer',
            source: 'bundled',
          },
        ],
      }),
    );

    expect(markup).toContain('Commands');
    expect(markup).toContain('Refresh Explorer');
    expect(markup).toContain('Document views');
    expect(markup).toContain('Editor Preview');
    expect(markup).toContain('Settings');
    expect(markup).toContain('workbench.explorer.compactFolders');
    expect(markup).toContain('Views');
    expect(markup).toContain('Explorer');
    expect(markup).toContain('Menus');
    expect(markup).toContain('view/title: Refresh Explorer');
    expect(markup).toContain('Capabilities');
    expect(markup).toContain('workbench.workspace');
    expect(markup).toContain('Permissions');
    expect(markup).toContain('workspace.read');
    expect(markup).toContain('Diagnostics');
  });

  it('renders extension sidebar action buttons outside row buttons', () => {
    const markup = renderToStaticMarkup(
      createElement(ExtensionManagementSidebar, {
        browseEntries: [
          {
            category: 'theme',
            description: 'Adds a dark theme.',
            displayName: 'Theme Pack',
            id: 'workbench-kit.samples.theme',
            installed: false,
            manifestUrl: '/extensions/theme/workbench.extension.json',
          },
        ],
        installedEntries: [],
        onInstall: () => undefined,
      }),
    );

    expect(markup).toContain(
      '<div class="ui-side-bar-list-item workbench-extensions-sidebar__item">',
    );
    expect(markup).not.toContain(
      '<button type="button" class="ui-side-bar-list-item workbench-extensions-sidebar__item"',
    );
  });

  it('renders sidebar diagnostics and missing-extension alerts', () => {
    const markup = renderToStaticMarkup(
      createElement(ExtensionManagementSidebar, {
        browseEntries: [],
        defaultTab: 'installed',
        installedEntries: [
          {
            category: 'builtin',
            description: 'Explorer',
            diagnostics: [
              {
                message: 'Capability "workbench.workspace" is missing.',
                severity: 'warning',
              },
            ],
            displayName: 'Explorer',
            enabled: true,
            id: 'workbench-kit.builtin.explorer',
            source: 'bundled',
          },
        ],
        missingExtensionIds: ['workbench-kit.missing.sample'],
      }),
    );

    expect(markup).toContain('Missing extensions');
    expect(markup).toContain('workbench-kit.missing.sample');
    expect(markup).toContain('Capability &quot;workbench.workspace&quot; is missing.');
    expect(markup).toContain('1 warning');
  });

  it('renders sidebar catalog install plan summaries before install', () => {
    const markup = renderToStaticMarkup(
      createElement(ExtensionManagementSidebar, {
        browseEntries: [
          {
            category: 'utility',
            description: 'Installs a command pack.',
            displayName: 'Command Pack',
            id: 'workbench-kit.samples.command-pack',
            installPlan: {
              blocked: false,
              enableExtensionIds: ['workbench-kit.samples.shared'],
              installExtensionIds: ['workbench-kit.samples.command-pack'],
              permissions: ['workspace.write'],
              requiresApproval: true,
            },
            installed: false,
            manifestUrl: 'workbench-kit.samples.command-pack',
          },
        ],
        installedEntries: [],
      }),
    );

    expect(markup).toContain('Install 1');
    expect(markup).toContain('Enable 1');
    expect(markup).toContain('Permissions 1');
  });

  it('blocks sidebar catalog installs when the install plan has errors', () => {
    const markup = renderToStaticMarkup(
      createElement(ExtensionManagementSidebar, {
        browseEntries: [
          {
            category: 'utility',
            description: 'Needs a missing dependency.',
            displayName: 'Blocked Pack',
            id: 'workbench-kit.samples.blocked-pack',
            installPlan: {
              blocked: true,
              diagnostics: [
                {
                  message: 'Extension depends on missing extension "missing".',
                  severity: 'error',
                },
              ],
              enableExtensionIds: [],
              installExtensionIds: ['workbench-kit.samples.blocked-pack'],
              permissions: [],
              requiresApproval: false,
            },
            installed: false,
            manifestUrl: 'workbench-kit.samples.blocked-pack',
          },
        ],
        installedEntries: [],
        onInstall: () => undefined,
      }),
    );

    expect(markup).toContain('Blocked');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Extension depends on missing extension');
  });
});
