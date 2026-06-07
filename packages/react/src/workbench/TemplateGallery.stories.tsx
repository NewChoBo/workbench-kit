import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';
import { TextInput } from '../primitives/TextInput';
import { WorkbenchShell } from './WorkbenchShell';

const meta = {
  title: 'React/Workbench/Hub/TemplateGallery',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type TemplateCardModel = {
  category: string;
  description: string;
  eyebrow: string;
  icon: string;
  id: string;
  title: string;
  tone: 'launchpad' | 'library' | 'source';
};

const templateCards: TemplateCardModel[] = [
  {
    category: 'Launchpad',
    description: 'Start from a blank grid and add tiles manually.',
    eyebrow: 'Starter',
    icon: 'codicon-rocket',
    id: 'blank-launchpad',
    title: 'Blank Launchpad',
    tone: 'launchpad',
  },
  {
    category: 'Launchpad',
    description: 'Four-tile gaming layout with wallpaper preview chrome.',
    eyebrow: 'Template',
    icon: 'codicon-layout',
    id: 'gaming-grid',
    title: 'Gaming Grid',
    tone: 'launchpad',
  },
  {
    category: 'Library',
    description: 'Browse installed apps and map items into tiles.',
    eyebrow: 'Catalog',
    icon: 'codicon-library',
    id: 'library-browse',
    title: 'Library Browse',
    tone: 'library',
  },
  {
    category: 'Source',
    description: 'Connect a provider and rebuild the local catalog.',
    eyebrow: 'Provider',
    icon: 'codicon-plug',
    id: 'source-manager',
    title: 'Source Manager',
    tone: 'source',
  },
];

function TemplateGalleryCard({
  card,
  onSelect,
}: {
  card: TemplateCardModel;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      aria-label={`${card.title}: Use template`}
      className="ui-template-gallery-card"
      data-tone={card.tone}
      type="button"
      onClick={() => onSelect(card.id)}
    >
      <span aria-hidden={true} className="ui-template-gallery-card__preview">
        <i className={card.icon} />
      </span>
      <span className="ui-template-gallery-card__body">
        <span className="ui-template-gallery-card__eyebrow">{card.eyebrow}</span>
        <strong className="ui-template-gallery-card__title">{card.title}</strong>
        <span className="ui-template-gallery-card__description">{card.description}</span>
        <span className="ui-template-gallery-card__meta">
          <Badge variant="muted">{card.category}</Badge>
        </span>
      </span>
    </button>
  );
}

function TemplateGalleryHarness({ loading = false }: { loading?: boolean }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | TemplateCardModel['tone']>('all');
  const [eventLog, setEventLog] = useState('Choose a template to begin.');

  const visibleCards = templateCards.filter((card) => {
    const matchesCategory = category === 'all' || card.tone === category;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      card.title.toLowerCase().includes(normalizedQuery) ||
      card.description.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <WorkbenchShell
      activityBar={{
        items: [
          {
            active: true,
            icon: <i className="codicon codicon-home" />,
            id: 'home',
            label: 'Home',
          },
          {
            icon: <i className="codicon codicon-library" />,
            id: 'library',
            label: 'Library',
          },
          {
            icon: <i className="codicon codicon-rocket" />,
            id: 'launchpad',
            label: 'Launchpad',
          },
        ],
      }}
      primarySidebar={{
        isVisible: true,
        minPrimarySizePercent: 24,
        maxPrimarySizePercent: 34,
        node: (
          <section className="ui-template-gallery-sidebar" style={{ padding: 12 }}>
            <h2 style={{ fontSize: 12, margin: '0 0 8px', textTransform: 'uppercase' }}>
              Start here
            </h2>
            <nav aria-label="Template sections" style={{ display: 'grid', gap: 6 }}>
              {(['all', 'launchpad', 'library', 'source'] as const).map((entry) => (
                <Button
                  key={entry}
                  variant={category === entry ? 'primary' : undefined}
                  onClick={() => setCategory(entry)}
                >
                  {entry === 'all' ? 'All templates' : entry}
                </Button>
              ))}
            </nav>
          </section>
        ),
        primarySizePercent: 28,
      }}
      rootClassName="ide-root"
      rootStyle={{ height: 'min(calc(100% - 120px), 720px)', minHeight: 0 }}
      secondaryArea={
        <section aria-label="Template gallery" className="ui-template-gallery">
          <header className="ui-template-gallery__header">
            <div>
              <h1 style={{ margin: 0 }}>Template Gallery</h1>
              <p style={{ color: 'var(--color-text-subtle)', margin: '6px 0 0' }}>
                Pick a starting point for library browse, launchpad authoring, or source setup.
              </p>
            </div>
            <TextInput
              aria-label="Search templates"
              controlWidth="wide"
              placeholder="Search templates"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </header>
          {loading ? (
            <div aria-busy={true} className="ui-template-gallery__grid">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  aria-hidden={true}
                  className="ui-template-gallery-card ui-template-gallery-card--skeleton"
                />
              ))}
            </div>
          ) : visibleCards.length === 0 ? (
            <EmptyState icon="codicon-search" title="No templates match">
              <Button onClick={() => setQuery('')}>Clear search</Button>
            </EmptyState>
          ) : (
            <div className="ui-template-gallery__grid">
              {visibleCards.map((card) => (
                <TemplateGalleryCard
                  key={card.id}
                  card={card}
                  onSelect={(id) => setEventLog(`Selected template: ${id}`)}
                />
              ))}
            </div>
          )}
          <footer aria-live="polite" className="ui-template-gallery__footer">
            {eventLog}
          </footer>
        </section>
      }
      statusSections={[
        {
          id: 'gallery',
          items: [
            {
              id: 'count',
              icon: <i className="codicon codicon-layers" />,
              label: loading ? 'Loading templates...' : `${visibleCards.length} templates`,
            },
          ],
        },
      ]}
    />
  );
}

export const CardGrid: Story = {
  render: () => <TemplateGalleryHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Gaming Grid/ }));
    await expect(canvas.getByText('Selected template: gaming-grid')).toBeVisible();
  },
};

export const LoadingSkeleton: Story = {
  render: () => <TemplateGalleryHarness loading />,
};

export const EmptyGallery: Story = {
  render: () => {
    const [query] = useState('missing-template');
    return (
      <section className="ui-template-gallery" style={{ padding: 24 }}>
        <EmptyState icon="codicon-inbox" title="Start from a template or create blank">
          No results for &quot;{query}&quot;.
        </EmptyState>
      </section>
    );
  },
};
