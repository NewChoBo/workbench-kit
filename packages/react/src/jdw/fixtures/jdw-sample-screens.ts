import {
  compileScreenSpecToJson,
  type LayoutConstraints,
  screenColumn,
  screenExpanded,
  screenGrid,
  screenPanel,
  screenRow,
  screenStack,
  screenText,
  type JdwScreenSpec,
} from '@workbench-kit/jdw';

export type JdwSampleScreenDefinition = JdwScreenSpec;

const muted = { color: '#9aa0a6' };
const accent = { color: '#4aa8ff' };

function defineScreen(spec: JdwScreenSpec): JdwSampleScreenDefinition {
  return spec;
}

export const JDW_SAMPLE_SCREENS: readonly JdwSampleScreenDefinition[] = [
  defineScreen({
    id: 'analytics-dashboard',
    title: 'Analytics Dashboard',
    description: 'Header, KPI strip, and two chart placeholders in a column layout.',
    frameWidth: 720,
    layout: { maxWidth: 720, maxHeight: 420 },
    root: screenColumn(
      [
        screenRow(
          [
            screenText('Analytics', { fontSize: 22, color: '#e8eaed' }),
            screenExpanded(screenText('Last 7 days', { fontSize: 12, ...muted })),
            screenText('Export', { fontSize: 12, ...accent }),
          ],
          { gap: 12 },
        ),
        screenGrid(4, [
          screenColumn(
            [
              screenText('Sessions', { fontSize: 11, ...muted }),
              screenText('12,480', { fontSize: 20, color: '#e8eaed' }),
              screenText('+8.2%', { fontSize: 11, color: '#34a853' }),
            ],
            { gap: 4, col: 0, row: 0 },
          ),
          screenColumn(
            [
              screenText('Bounce rate', { fontSize: 11, ...muted }),
              screenText('41.3%', { fontSize: 20, color: '#e8eaed' }),
              screenText('-1.4%', { fontSize: 11, color: '#34a853' }),
            ],
            { gap: 4, col: 1, row: 0 },
          ),
          screenColumn(
            [
              screenText('Avg. duration', { fontSize: 11, ...muted }),
              screenText('3m 12s', { fontSize: 20, color: '#e8eaed' }),
              screenText('+0.6%', { fontSize: 11, color: '#34a853' }),
            ],
            { gap: 4, col: 2, row: 0 },
          ),
          screenColumn(
            [
              screenText('Conversion', { fontSize: 11, ...muted }),
              screenText('2.9%', { fontSize: 20, color: '#e8eaed' }),
              screenText('-0.2%', { fontSize: 11, color: '#f28b82' }),
            ],
            { gap: 4, col: 3, row: 0 },
          ),
        ]),
        screenRow(
          [
            screenExpanded(screenPanel('Traffic trend', '#1e2127')),
            screenExpanded(screenPanel('Top channels', '#1e2127')),
          ],
          {
            gap: 12,
          },
        ),
      ],
      { gap: 16, padding: 20, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'user-profile',
    title: 'User Profile',
    description: 'Avatar block with name, email, and role badge.',
    frameWidth: 480,
    layout: { maxWidth: 480, maxHeight: 160 },
    root: screenRow(
      [
        screenPanel('AV', '#353a42'),
        screenColumn(
          [
            screenText('Alex Morgan', { fontSize: 18, color: '#e8eaed' }),
            screenText('alex.morgan@example.com', { fontSize: 12, ...muted }),
            screenText('Workspace admin', { fontSize: 11, color: '#34a853' }),
          ],
          { gap: 4 },
        ),
      ],
      { gap: 16, padding: 20, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'settings-panel',
    title: 'Settings Panel',
    description: 'Label and value rows for a compact preferences block.',
    frameWidth: 520,
    layout: { maxWidth: 520, maxHeight: 280 },
    root: screenColumn(
      [
        screenText('Preferences', { fontSize: 18, color: '#e8eaed' }),
        screenRow(
          [
            screenExpanded(screenText('Theme', { fontSize: 13, ...muted })),
            screenText('Dark', { fontSize: 13, color: '#e8eaed' }),
          ],
          { gap: 8 },
        ),
        screenRow(
          [
            screenExpanded(screenText('Language', { fontSize: 13, ...muted })),
            screenText('English', { fontSize: 13, color: '#e8eaed' }),
          ],
          { gap: 8 },
        ),
        screenRow(
          [
            screenExpanded(screenText('Notifications', { fontSize: 13, ...muted })),
            screenText('Enabled', { fontSize: 13, color: '#34a853' }),
          ],
          { gap: 8 },
        ),
        screenRow(
          [
            screenExpanded(screenText('Auto-save', { fontSize: 13, ...muted })),
            screenText('Every 30s', { fontSize: 13, color: '#e8eaed' }),
          ],
          { gap: 8 },
        ),
      ],
      { gap: 12, padding: 20, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'pricing-plans',
    title: 'Pricing Plans',
    description: 'Three plan cards in a grid with highlighted middle tier.',
    frameWidth: 720,
    layout: { maxWidth: 720, maxHeight: 300 },
    root: screenColumn(
      [
        screenText('Choose a plan', { fontSize: 20, color: '#e8eaed' }),
        screenGrid(3, [
          screenColumn(
            [
              screenText('Starter', { fontSize: 14, color: '#e8eaed' }),
              screenText('$0', { fontSize: 24, color: '#e8eaed' }),
              screenText('For personal projects', { fontSize: 11, ...muted }),
            ],
            { gap: 6, col: 0, row: 0, padding: 12, background: '#1e2127' },
          ),
          screenColumn(
            [
              screenText('Pro', { fontSize: 14, color: '#e8eaed' }),
              screenText('$12', { fontSize: 24, color: '#4aa8ff' }),
              screenText('For growing teams', { fontSize: 11, ...muted }),
            ],
            { gap: 6, col: 1, row: 0, padding: 12, background: '#2b3a4f' },
          ),
          screenColumn(
            [
              screenText('Enterprise', { fontSize: 14, color: '#e8eaed' }),
              screenText('Custom', { fontSize: 24, color: '#e8eaed' }),
              screenText('For large orgs', { fontSize: 11, ...muted }),
            ],
            { gap: 6, col: 2, row: 0, padding: 12, background: '#1e2127' },
          ),
        ]),
      ],
      { gap: 16, padding: 20, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'media-gallery',
    title: 'Media Gallery',
    description: 'Three media cards with image placeholders and captions.',
    frameWidth: 720,
    layout: { maxWidth: 720, maxHeight: 360 },
    root: screenColumn(
      [
        screenText('Recent uploads', { fontSize: 18, color: '#e8eaed' }),
        screenGrid(3, [
          screenColumn(
            [
              screenPanel(' ', '#2b2f36'),
              screenText('Mountain trail', { fontSize: 13, color: '#e8eaed' }),
              screenText('Edited 2h ago', { fontSize: 11, ...muted }),
            ],
            {
              gap: 8,
              col: 0,
              row: 0,
            },
          ),
          screenColumn(
            [
              screenPanel(' ', '#2b2f36'),
              screenText('City skyline', { fontSize: 13, color: '#e8eaed' }),
              screenText('Edited yesterday', { fontSize: 11, ...muted }),
            ],
            {
              gap: 8,
              col: 1,
              row: 0,
            },
          ),
          screenColumn(
            [
              screenPanel(' ', '#2b2f36'),
              screenText('Studio portrait', { fontSize: 13, color: '#e8eaed' }),
              screenText('Edited 3d ago', { fontSize: 11, ...muted }),
            ],
            {
              gap: 8,
              col: 2,
              row: 0,
            },
          ),
        ]),
      ],
      { gap: 16, padding: 20, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'inbox-list',
    title: 'Inbox List',
    description: 'Stacked message rows with sender, preview, and timestamp.',
    frameWidth: 520,
    layout: { maxWidth: 520, maxHeight: 320 },
    root: screenColumn(
      [
        screenText('Inbox', { fontSize: 18, color: '#e8eaed' }),
        screenColumn(
          [
            screenRow(
              [
                screenExpanded(
                  screenColumn(
                    [
                      screenText('Design review', { fontSize: 13, color: '#e8eaed' }),
                      screenText('Updated mockups are ready for sign-off.', {
                        fontSize: 11,
                        ...muted,
                      }),
                    ],
                    { gap: 2 },
                  ),
                ),
                screenText('9:41', { fontSize: 10, ...muted }),
              ],
              { gap: 8, padding: 10, background: '#1e2127' },
            ),
            screenRow(
              [
                screenExpanded(
                  screenColumn(
                    [
                      screenText('Deploy notice', { fontSize: 13, color: '#e8eaed' }),
                      screenText('Production release completed successfully.', {
                        fontSize: 11,
                        ...muted,
                      }),
                    ],
                    { gap: 2 },
                  ),
                ),
                screenText('8:05', { fontSize: 10, ...muted }),
              ],
              { gap: 8, padding: 10, background: '#1e2127' },
            ),
            screenRow(
              [
                screenExpanded(
                  screenColumn(
                    [
                      screenText('Weekly summary', { fontSize: 13, color: '#e8eaed' }),
                      screenText('Your workspace activity report is available.', {
                        fontSize: 11,
                        ...muted,
                      }),
                    ],
                    { gap: 2 },
                  ),
                ),
                screenText('Mon', { fontSize: 10, ...muted }),
              ],
              { gap: 8, padding: 10, background: '#1e2127' },
            ),
          ],
          { gap: 8 },
        ),
      ],
      { gap: 10, padding: 16, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'app-toolbar',
    title: 'App Toolbar',
    description: 'Horizontal navigation bar with brand, links, and primary action.',
    frameWidth: 720,
    layout: { maxWidth: 720, maxHeight: 72 },
    root: screenRow(
      [
        screenText('Workbench', { fontSize: 14, color: '#e8eaed' }),
        screenText('Projects', { fontSize: 12, ...accent }),
        screenText('Assets', { fontSize: 12, ...muted }),
        screenText('Docs', { fontSize: 12, ...muted }),
        screenExpanded(screenText(' ', { fontSize: 12 })),
        screenPanel('New project', '#2b5d9f'),
      ],
      { gap: 16, padding: 14, background: '#1e2127' },
    ),
  }),
  defineScreen({
    id: 'hero-landing',
    title: 'Hero Landing',
    description: 'Centered hero copy with supporting text and call-to-action row.',
    frameWidth: 720,
    layout: { maxWidth: 720, maxHeight: 320 },
    root: screenColumn(
      [
        screenText('Build widget screens from JSON', { fontSize: 26, color: '#e8eaed' }),
        screenText(
          'Compose layouts with row, column, grid, and stack primitives. Preview instantly in Storybook.',
          {
            fontSize: 13,
            ...muted,
          },
        ),
        screenRow([screenPanel('Get started', '#2b5d9f'), screenPanel('View samples', '#2b2f36')], {
          gap: 12,
        }),
      ],
      { gap: 16, padding: 32, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'stack-badge-card',
    title: 'Stack Badge Card',
    description: 'Card body with a positioned badge overlay using stack placement.',
    frameWidth: 360,
    layout: { maxWidth: 360, maxHeight: 200 },
    root: screenStack(
      [
        screenColumn(
          [
            screenPanel(' ', '#2b2f36'),
            screenText('Product launch', { fontSize: 15, color: '#e8eaed' }),
            screenText('Ship the first JDW sample gallery.', { fontSize: 11, ...muted }),
          ],
          { gap: 8, padding: 16, background: '#1e2127' },
        ),
        {
          kind: 'text',
          content: 'NEW',
          style: { fontSize: 10, color: '#13151a', background: '#fbbc04' },
          top: 10,
          right: 10,
          left: 300,
          bottom: 160,
        },
      ],
      { background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'feature-grid',
    title: 'Feature Grid',
    description: 'Two-by-three feature tiles with icon placeholders.',
    frameWidth: 640,
    layout: { maxWidth: 640, maxHeight: 360 },
    root: screenColumn(
      [
        screenText('Platform features', { fontSize: 18, color: '#e8eaed' }),
        screenGrid(2, [
          screenColumn(
            [
              screenPanel('⚡', '#2b2f36'),
              screenText('Fast preview', { fontSize: 13, color: '#e8eaed' }),
              screenText('Layout rects drive CSS rendering.', { fontSize: 11, ...muted }),
            ],
            {
              gap: 6,
              col: 0,
              row: 0,
              padding: 12,
              background: '#1e2127',
            },
          ),
          screenColumn(
            [
              screenPanel('📐', '#2b2f36'),
              screenText('Headless layout', { fontSize: 13, color: '#e8eaed' }),
              screenText('Shared math for row, grid, and stack.', { fontSize: 11, ...muted }),
            ],
            {
              gap: 6,
              col: 1,
              row: 0,
              padding: 12,
              background: '#1e2127',
            },
          ),
          screenColumn(
            [
              screenPanel('🧩', '#2b2f36'),
              screenText('Composable assets', { fontSize: 13, color: '#e8eaed' }),
              screenText('Package manifest + content.json.', { fontSize: 11, ...muted }),
            ],
            {
              gap: 6,
              col: 0,
              row: 1,
              padding: 12,
              background: '#1e2127',
            },
          ),
          screenColumn(
            [
              screenPanel('✓', '#2b2f36'),
              screenText('Schema validation', { fontSize: 13, color: '#e8eaed' }),
              screenText('JDW profile checks before render.', { fontSize: 11, ...muted }),
            ],
            {
              gap: 6,
              col: 1,
              row: 1,
              padding: 12,
              background: '#1e2127',
            },
          ),
        ]),
      ],
      { gap: 16, padding: 20, background: '#13151a' },
    ),
  }),
  defineScreen({
    id: 'status-board',
    title: 'Status Board',
    description: 'Service health rows with colored status chips.',
    frameWidth: 560,
    layout: { maxWidth: 560, maxHeight: 260 },
    root: screenColumn(
      [
        screenText('System status', { fontSize: 18, color: '#e8eaed' }),
        screenColumn(
          [
            screenRow(
              [
                screenExpanded(screenText('API gateway', { fontSize: 13, color: '#e8eaed' })),
                screenText('Operational', {
                  fontSize: 11,
                  color: '#34a853',
                  background: '#1a2e1f',
                }),
              ],
              { gap: 8 },
            ),
            screenRow(
              [
                screenExpanded(screenText('Widget renderer', { fontSize: 13, color: '#e8eaed' })),
                screenText('Operational', {
                  fontSize: 11,
                  color: '#34a853',
                  background: '#1a2e1f',
                }),
              ],
              { gap: 8 },
            ),
            screenRow(
              [
                screenExpanded(screenText('Asset sync', { fontSize: 13, color: '#e8eaed' })),
                screenText('Degraded', { fontSize: 11, color: '#fbbc04', background: '#2e2818' }),
              ],
              { gap: 8 },
            ),
          ],
          { gap: 8 },
        ),
      ],
      { gap: 12, padding: 20, background: '#13151a' },
    ),
  }),
];

export function sampleLayoutConstraints(
  screenDefinition: JdwSampleScreenDefinition,
): LayoutConstraints {
  return {
    minWidth: 0,
    maxWidth: screenDefinition.layout.maxWidth,
    minHeight: 0,
    maxHeight: screenDefinition.layout.maxHeight,
  };
}

export function formatJdwSampleScreenJson(screenDefinition: JdwSampleScreenDefinition): string {
  return compileScreenSpecToJson(screenDefinition);
}

export function formatJdwSampleScreenSpec(screenDefinition: JdwSampleScreenDefinition): string {
  return `${JSON.stringify(screenDefinition, null, 2)}\n`;
}

export const JDW_SAMPLE_SCREEN_MAP = Object.fromEntries(
  JDW_SAMPLE_SCREENS.map((sample) => [sample.id, sample]),
) as Record<string, JdwSampleScreenDefinition>;
