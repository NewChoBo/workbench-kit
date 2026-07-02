import { expect } from 'storybook/test';

export const PRIMARY_SIDEBAR_COLLAPSED_CLASS = 'ui-workbench-split-view--primary-collapsed';
export const SECONDARY_SIDEBAR_COLLAPSED_CLASS = 'ui-workbench-split-view--secondary-collapsed';

const FULL_WIDTH_TOLERANCE_PX = 2;
const FULL_HEIGHT_TOLERANCE_PX = 2;

/**
 * Regression guard for the primary-sidebar collapse layout (see styles.css
 * `.ui-workbench-split-view--primary-collapsed`). SplitView stays mounted;
 * the secondary/editor column must expand to the full split width.
 */
export function expectCollapsedPrimarySidebarShowsFullWidthSecondary(root: HTMLElement) {
  const splitView = root.querySelector(`.${PRIMARY_SIDEBAR_COLLAPSED_CLASS}`);
  expect(splitView).not.toBeNull();

  const primary = splitView?.querySelector('.ui-workbench-split-view__primary');
  const secondary = splitView?.querySelector('.ui-workbench-split-view__secondary');
  expect(primary).not.toBeNull();
  expect(secondary).not.toBeNull();

  expect(window.getComputedStyle(primary as Element).display).toBe('none');

  const splitRect = (splitView as Element).getBoundingClientRect();
  const secondaryRect = (secondary as Element).getBoundingClientRect();
  expect(secondaryRect.width).toBeGreaterThan(0);
  expect(secondaryRect.height).toBeGreaterThan(0);
  expect(Math.abs(secondaryRect.width - splitRect.width)).toBeLessThanOrEqual(
    FULL_WIDTH_TOLERANCE_PX,
  );
  expect(Math.abs(secondaryRect.height - splitRect.height)).toBeLessThanOrEqual(
    FULL_HEIGHT_TOLERANCE_PX,
  );
}

export function expectExpandedPrimarySidebar(root: HTMLElement) {
  expect(root.querySelector(`.${PRIMARY_SIDEBAR_COLLAPSED_CLASS}`)).toBeNull();

  const splitView = root.querySelector('.ui-workbench-split-view');
  expect(splitView).not.toBeNull();

  const primary = splitView?.querySelector('.ui-workbench-split-view__primary');
  const secondary = splitView?.querySelector('.ui-workbench-split-view__secondary');
  expect(primary).not.toBeNull();
  expect(secondary).not.toBeNull();
  expect(window.getComputedStyle(primary as Element).display).not.toBe('none');
}

/**
 * Regression guard for auxiliary-sidebar / bottom-panel collapse layout.
 * SplitView stays mounted; the primary/editor column must expand to full size.
 */
export function expectCollapsedSecondarySplitShowsFullWidthPrimary(root: HTMLElement) {
  const splitView = root.querySelector(`.${SECONDARY_SIDEBAR_COLLAPSED_CLASS}`);
  expect(splitView).not.toBeNull();

  const primary = splitView?.querySelector('.ui-workbench-split-view__primary');
  const secondary = splitView?.querySelector('.ui-workbench-split-view__secondary');
  expect(primary).not.toBeNull();
  expect(secondary).not.toBeNull();

  expect(window.getComputedStyle(secondary as Element).display).toBe('none');

  const splitRect = (splitView as Element).getBoundingClientRect();
  const primaryRect = (primary as Element).getBoundingClientRect();
  expect(primaryRect.width).toBeGreaterThan(0);
  expect(Math.abs(primaryRect.width - splitRect.width)).toBeLessThanOrEqual(
    FULL_WIDTH_TOLERANCE_PX,
  );
}

export function expectCollapsedSecondaryVerticalSplitShowsFullHeightPrimary(root: HTMLElement) {
  const splitView = root.querySelector(
    `.${SECONDARY_SIDEBAR_COLLAPSED_CLASS}[data-orientation='vertical']`,
  );
  expect(splitView).not.toBeNull();

  const primary = splitView?.querySelector('.ui-workbench-split-view__primary');
  const secondary = splitView?.querySelector('.ui-workbench-split-view__secondary');
  expect(primary).not.toBeNull();
  expect(secondary).not.toBeNull();

  expect(window.getComputedStyle(secondary as Element).display).toBe('none');

  const splitRect = (splitView as Element).getBoundingClientRect();
  const primaryRect = (primary as Element).getBoundingClientRect();
  expect(primaryRect.height).toBeGreaterThan(0);
  expect(Math.abs(primaryRect.height - splitRect.height)).toBeLessThanOrEqual(
    FULL_HEIGHT_TOLERANCE_PX,
  );
}
