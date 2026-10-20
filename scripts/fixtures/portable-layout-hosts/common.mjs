/* global document, window */
import { createWorkbenchLayoutActions, LayoutService } from '/vendor/layout.js';

export const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
export async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await pause();
  }
  throw new Error(`Timed out: ${label}`);
}
const initial = {
  activityBar: { itemOrder: ['search', 'explorer'], hiddenItemIds: ['search'] },
  sideBar: { activeViewContainer: 'explorer', sizePercent: 32, visible: true },
  panel: { activeViewContainer: 'output', sizePercent: 28, visible: true },
  auxiliaryBar: { visible: true },
};
const equal = (actual, expected, label) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(label);
};
const check = (condition, label) => {
  if (!condition) throw new Error(label);
};

export function startHost(host, mount) {
  const service = new LayoutService(initial);
  const actions = createWorkbenchLayoutActions(service);
  const snapshot = () => ({ state: service.getState(), focusMode: service.isFocusModeActive() });
  const model = {
    service,
    actions,
    snapshot,
    active: 0,
    deliveries: 0,
    subscribe(render) {
      model.active += 1;
      const subscription = service.onDidChangeLayout(() => {
        model.deliveries += 1;
        render(snapshot());
      });
      render(snapshot());
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        subscription.dispose();
        model.active -= 1;
      };
    },
    controls: [
      ['primary', 'Toggle primary sidebar', actions.togglePrimarySidebar],
      ['auxiliary', 'Toggle auxiliary sidebar', actions.toggleAuxiliarySidebar],
      ['panel', 'Toggle panel', actions.togglePanel],
      ['focus', 'Toggle focus mode', actions.toggleFocusMode],
      ['activate', 'Activate explorer', () => actions.focusActivity('explorer')],
      ['show', 'Show explorer', () => actions.showActivity('explorer')],
    ],
  };
  const target = document.getElementById('host');
  let mounted;
  const mountHost = async () => {
    if (mounted) return;
    mounted = await mount(target, model);
    await waitFor(() => model.active === 1, `${host} mounted subscription`);
  };
  const unmountHost = async () => {
    if (!mounted) return;
    const previous = mounted;
    mounted = undefined;
    await previous.unmount();
    equal(model.active, 0, `${host} leaked subscription`);
  };
  const readView = () => JSON.parse(target.querySelector('[data-state]').textContent);
  const sync = async () => {
    await waitFor(
      () => JSON.stringify(readView()) === JSON.stringify(snapshot()),
      `${host} state projection`,
    );
  };
  const click = async (id) => {
    target.querySelector(`[data-action="${id}"]`).click();
    await sync();
  };
  const ready = (async () => {
    const cases = [];
    const run = async (name, test) => {
      await test();
      cases.push(name);
    };
    await mountHost();
    await run('mount preserves state and owns one subscription', async () => {
      await sync();
      equal(service.getState(), new LayoutService(initial).getState(), 'mount changed state');
    });
    await run('immediate double toggles preserve metadata', async () => {
      const before = snapshot();
      for (const id of ['primary', 'auxiliary', 'panel', 'focus']) {
        const button = target.querySelector(`[data-action="${id}"]`);
        button.click();
        button.click();
        await sync();
        equal(snapshot(), before, `${id} stale toggle`);
      }
    });
    await run('external updates project before next action', async () => {
      service.setSideBarVisible(false);
      service.setPanelVisible(false);
      service.setAuxiliaryBarVisible(false);
      await sync();
      await click('primary');
      await click('panel');
      await click('auxiliary');
      check(
        service.getState().sideBar.visible &&
          service.getState().panel.visible &&
          service.getState().auxiliaryBar.visible,
        'stale external state',
      );
    });
    await run('activity reactivation differs from show', async () => {
      await click('activate');
      check(!service.getState().sideBar.visible, 'reactivation did not collapse');
      await click('show');
      const deliveries = model.deliveries;
      await click('show');
      equal(model.deliveries, deliveries, 'show was not idempotent');
    });
    await run('focus mode restores original layout', async () => {
      const before = snapshot();
      await click('focus');
      actions.showActivity('search');
      actions.togglePanel();
      await sync();
      await click('focus');
      equal(snapshot(), before, 'focus snapshot lost');
    });
    await run('state rendering preserves button identity and focus', async () => {
      const button = target.querySelector('[data-action="primary"]');
      button.focus();
      service.setPanelVisible(false);
      await sync();
      check(
        document.activeElement === button &&
          target.querySelector('[data-action="primary"]') === button,
        'render replaced focused control',
      );
    });
    await run('another service remains independent', async () => {
      const other = new LayoutService();
      const before = snapshot();
      createWorkbenchLayoutActions(other).togglePrimarySidebar();
      equal(snapshot(), before, 'service state shared');
      other.dispose();
    });
    await run('unmount stops delivery and remount reads current service', async () => {
      await unmountHost();
      check(!target.querySelector('[data-state]'), 'unmount retained view');
      const deliveries = model.deliveries;
      actions.togglePrimarySidebar();
      equal(model.deliveries, deliveries, 'unmounted consumer received event');
      await mountHost();
      await sync();
    });
    await run('three real remounts retain one live subscription', async () => {
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await unmountHost();
        await mountHost();
        const before = model.deliveries;
        actions.togglePanel();
        await sync();
        equal(model.deliveries, before + 1, 'duplicate event delivery');
      }
    });
    service.reset(initial);
    await sync();
    document.getElementById('status').textContent = `${host}: ${cases.length} cases passed`;
    return { host, cases };
  })();
  document.getElementById('unmount').onclick = () => unmountHost();
  document.getElementById('mount').onclick = () => mountHost();
  document.getElementById('reset').onclick = () => service.reset(initial);
  window.portableLayoutFixture = { ready, model, mount: mountHost, unmount: unmountHost };
  ready.catch((error) => {
    document.getElementById('status').textContent = String(error);
  });
}
