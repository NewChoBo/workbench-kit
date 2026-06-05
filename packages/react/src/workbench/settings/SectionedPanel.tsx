import { Fragment, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { WorkbenchNavigationPanel } from './NavigationPanel';

export interface WorkbenchSectionedPanelItem {
  anchorId: string;
  count?: number | undefined;
  render: () => ReactNode;
  title: ReactNode;
}

export interface WorkbenchSectionedPanelProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  activeAnchorId?: string | undefined;
  ariaLabel: string;
  contentClassName?: string | undefined;
  defaultActiveAnchorId?: string | undefined;
  items: readonly WorkbenchSectionedPanelItem[];
  navClassName?: string | undefined;
  navLinkClassName?: string | undefined;
  onActiveAnchorChange?: ((anchorId: string | undefined) => void) | undefined;
  readOnly?: boolean | undefined;
}

function findPanelSection(content: HTMLElement, anchorId: string) {
  return Array.from(content.querySelectorAll<HTMLElement>('[id]')).find(
    (element) => element.id === anchorId,
  );
}

export function WorkbenchSectionedPanel({
  activeAnchorId,
  ariaLabel,
  className,
  contentClassName,
  defaultActiveAnchorId,
  items,
  navClassName,
  navLinkClassName,
  onActiveAnchorChange,
  readOnly = false,
  ...props
}: WorkbenchSectionedPanelProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [uncontrolledActiveAnchorId, setUncontrolledActiveAnchorId] = useState<string | undefined>(
    defaultActiveAnchorId ?? items[0]?.anchorId,
  );
  const showSectionNav = items.length > 1;
  const preferredActiveAnchorId = activeAnchorId ?? uncontrolledActiveAnchorId;
  const resolvedActiveAnchorId =
    preferredActiveAnchorId && items.some((item) => item.anchorId === preferredActiveAnchorId)
      ? preferredActiveAnchorId
      : items[0]?.anchorId;

  const setActiveAnchorId = (anchorId: string | undefined) => {
    if (activeAnchorId === undefined) {
      setUncontrolledActiveAnchorId(anchorId);
    }

    onActiveAnchorChange?.(anchorId);
  };

  const updateActiveSection = () => {
    const content = contentRef.current;
    if (!content) return;

    const contentTop = content.getBoundingClientRect().top;
    const anchorOffset = contentTop + 18;
    let nextActive = items[0]?.anchorId;

    for (const item of items) {
      const section = findPanelSection(content, item.anchorId);
      if (!section) continue;
      if (section.getBoundingClientRect().top <= anchorOffset) {
        nextActive = item.anchorId;
      } else {
        break;
      }
    }

    setActiveAnchorId(nextActive);
  };

  return (
    <WorkbenchNavigationPanel
      className={cx('ui-workbench-sectioned-panel', className)}
      content={items.map((item) => (
        <Fragment key={item.anchorId}>{item.render()}</Fragment>
      ))}
      contentClassName={cx('ui-workbench-sectioned-panel__content', contentClassName)}
      contentProps={{
        ref: contentRef,
        onScroll: updateActiveSection,
      }}
      data-readonly={readOnly ? 'true' : undefined}
      nav={
        showSectionNav
          ? items.map((item) => {
              const active = resolvedActiveAnchorId === item.anchorId;

              return (
                <a
                  key={item.anchorId}
                  aria-current={active ? 'true' : undefined}
                  className={cx('ui-workbench-sectioned-panel__nav-link', navLinkClassName)}
                  data-active={active ? 'true' : undefined}
                  href={`#${item.anchorId}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveAnchorId(item.anchorId);
                    const content = contentRef.current;
                    const section = content ? findPanelSection(content, item.anchorId) : null;
                    section?.scrollIntoView({ block: 'start' });
                  }}
                >
                  <span>{item.title}</span>
                  {item.count !== undefined ? <em>{item.count}</em> : null}
                </a>
              );
            })
          : null
      }
      navClassName={cx('ui-workbench-sectioned-panel__nav', navClassName)}
      navProps={{ 'aria-label': ariaLabel }}
      {...props}
    />
  );
}
