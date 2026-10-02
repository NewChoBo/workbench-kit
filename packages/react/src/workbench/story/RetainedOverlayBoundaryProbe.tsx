import { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { WorkbenchShell } from '../shell/WorkbenchShell';
import { WorkbenchDesktopTitleBar } from '../shell/WorkbenchDesktopTitleBar';
import { WorkbenchModalPortal } from '../chrome/WorkbenchModalPortal';
import { Modal } from '../../modal/Modal';
import { Select } from '../../primitives/select/Select';
import { IconButton } from '../../primitives/icon-button/IconButton';
import { ContextMenu } from '../../overlay/ContextMenu';

export function RetainedOverlayBoundaryDemo() {
  const [canvas, setCanvas] = useState(true);
  const [modal, setModal] = useState(false);
  const [linkEnabled, setLinkEnabled] = useState(true);
  const [changes, setChanges] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuActions, setMenuActions] = useState(0);
  const fallback = useRef<HTMLInputElement>(null);
  return (
    <div style={{ width: 720, maxWidth: '100%', height: 220 }}>
      <WorkbenchShell
        rootClassName="ide-root"
        presentation={canvas ? 'canvas' : 'docked'}
        presentationFocusTargets={{ canvas: fallback }}
        titleBar={
          <WorkbenchDesktopTitleBar
            leading={
              <IconButton
                icon="arrow-swap"
                label="Switch mode"
                onClick={() => setCanvas((value) => !value)}
              />
            }
            trailing={
              <>
                <IconButton
                  icon="list-unordered"
                  label="Open bounded menu"
                  onClick={(event) => {
                    const box = event.currentTarget.getBoundingClientRect();
                    setMenuPosition({ x: box.left, y: box.bottom });
                  }}
                />
                <IconButton icon="lock" label="Global dialog" onClick={() => setModal(true)} />
                <IconButton
                  icon="link"
                  label="Disable remembered link"
                  onClick={() => setLinkEnabled(false)}
                />
              </>
            }
          />
        }
        activityBar={{ items: [] }}
        secondaryArea={
          <main>
            <button>Docked target</button>
          </main>
        }
        canvasArea={
          <section
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              padding: 10,
              gap: 4,
            }}
          >
            <input aria-label="Canvas fallback" ref={fallback} />
            <a href={linkEnabled ? '#retained-draft' : undefined}>Remembered link</a>
            <Select aria-label="Edge chooser" onChange={() => setChanges((value) => value + 1)}>
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index} value={index}>
                  Option {index}
                </option>
              ))}
            </Select>
            <output aria-label="Local changes">{changes}</output>
            <output aria-label="Menu actions">{menuActions}</output>
            {menuPosition ? (
              <WorkbenchModalPortal>
                <ContextMenu
                  ariaLabel="Bounded actions"
                  {...menuPosition}
                  items={Array.from({ length: 30 }, (_, index) => ({
                    label: `Action ${index}`,
                    onSelect: () => setMenuActions((value) => value + 1),
                  }))}
                  onClose={() => setMenuPosition(null)}
                />
              </WorkbenchModalPortal>
            ) : null}
          </section>
        }
        statusSections={[]}
        overlays={
          modal ? (
            <WorkbenchModalPortal>
              <Modal
                title="Global owner"
                closeOnEscape={false}
                minHeight={100}
                defaultHeight={140}
                minWidth={200}
                defaultWidth={320}
                onClose={() => setModal(false)}
              >
                <button onClick={() => setModal(false)}>Close global dialog</button>
              </Modal>
            </WorkbenchModalPortal>
          ) : null
        }
      />
    </div>
  );
}

export async function verifyRetainedOverlayBoundaries({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const canvas = within(canvasElement);
  const user = userEvent.setup({ document: canvasElement.ownerDocument });
  const frame = canvasElement.querySelector<HTMLElement>('.ui-workbench-frame')!;
  const owner = frame.querySelector<HTMLElement>('[data-workbench-presentation="canvas"]')!;
  const chooser = canvas.getByRole('combobox', { name: 'Edge chooser' });
  await user.click(chooser);
  const popup = canvas.getByRole('listbox');
  await waitFor(() => {
    const bounds = owner.getBoundingClientRect();
    const box = popup.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(bounds.top + 7.5);
    expect(box.bottom).toBeLessThanOrEqual(bounds.bottom - 7.5);
    expect(box.left).toBeGreaterThanOrEqual(bounds.left + 7.5);
    expect(box.right).toBeLessThanOrEqual(bounds.right - 7.5);
    expect(box.height).toBeGreaterThan(0);
  });
  canvas.getByRole('button', { name: 'Global dialog' }).click();
  const dialog = await canvas.findByRole('dialog', { name: 'Global owner' });
  const close = within(dialog).getByRole('button', { name: 'Close global dialog' });
  await user.pointer({ target: close, keys: '[MouseLeft>]' });
  expect(canvas.getByRole('listbox')).toBe(popup);
  await user.pointer({ target: close, keys: '[/MouseLeft]' });
  await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  canvas.getByRole('button', { name: 'Global dialog' }).click();
  const reopened = await canvas.findByRole('dialog', { name: 'Global owner' });
  await user.keyboard('{Escape}');
  expect(canvas.getByRole('dialog')).toBe(reopened);
  expect(canvas.getByRole('listbox')).toBe(popup);
  const globalFocus = reopened.ownerDocument.activeElement;
  canvas.getByRole('button', { name: 'Switch mode' }).click();
  await waitFor(() => expect(owner.getBoundingClientRect().height).toBe(0));
  expect(reopened.ownerDocument.activeElement).toBe(globalFocus);
  canvas.getByRole('button', { name: 'Switch mode' }).click();
  await waitFor(() => expect(owner.getBoundingClientRect().height).toBeGreaterThan(0));
  expect(reopened.ownerDocument.activeElement).toBe(globalFocus);
  await user.click(within(reopened).getByRole('button', { name: 'Close global dialog' }));
  expect(canvas.getByRole('listbox')).toBe(popup);
  expect(canvas.getByLabelText('Local changes')).toHaveTextContent('0');
  await user.click(within(popup).getByRole('option', { name: 'Option 1' }));
  expect(canvas.getByLabelText('Local changes')).toHaveTextContent('1');
  const link = canvas.getByRole('link', { name: 'Remembered link' });
  link.focus();
  canvas.getByRole('button', { name: 'Switch mode' }).click();
  await waitFor(() => expect(owner).toHaveAttribute('hidden'));
  canvas.getByRole('button', { name: 'Disable remembered link' }).click();
  await waitFor(() => expect(link).not.toHaveAttribute('href'));
  canvas.getByRole('button', { name: 'Switch mode' }).click();
  await waitFor(() =>
    expect(canvas.getByRole('textbox', { name: 'Canvas fallback' })).toHaveFocus(),
  );
  await user.click(canvas.getByRole('button', { name: 'Open bounded menu' }));
  const menu = await canvas.findByRole('menu', { name: 'Bounded actions' });
  await waitFor(() => {
    const bounds = owner.getBoundingClientRect();
    const box = menu.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(bounds.top + 3.5);
    expect(box.bottom).toBeLessThanOrEqual(bounds.bottom - 3.5);
    expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight);
    expect(
      menu.contains(
        menu.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
      ),
    ).toBe(true);
  });
  await user.keyboard('{End}');
  await waitFor(() => {
    expect(canvas.getByRole('menu', { name: 'Bounded actions' })).toBe(menu);
    expect(within(menu).getByRole('menuitem', { name: 'Action 29' })).toHaveFocus();
    expect(menu.scrollTop).toBeGreaterThan(0);
  });
  expect(canvas.getByLabelText('Menu actions')).toHaveTextContent('0');
  await user.keyboard('{Enter}');
  await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  expect(canvas.getByLabelText('Menu actions')).toHaveTextContent('1');
  // Leave the bounded menu open at its first item for a trusted browser wheel
  // check; synthetic WheelEvent dispatch does not perform native scrolling.
  await user.click(canvas.getByRole('button', { name: 'Open bounded menu' }));
  await waitFor(() => {
    expect(canvas.getByRole('menuitem', { name: 'Action 0' })).toHaveFocus();
    const reopenedMenu = canvas.getByRole('menu', { name: 'Bounded actions' });
    const box = reopenedMenu.getBoundingClientRect();
    expect(
      reopenedMenu.contains(
        reopenedMenu.ownerDocument.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        ),
      ),
    ).toBe(true);
  });
}
