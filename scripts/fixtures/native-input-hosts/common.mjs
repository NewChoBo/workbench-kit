/* global document, window, InputEvent, CompositionEvent */

export const fields = ['primary', 'secondary'];
export const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function waitFor(predicate, description) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await pause();
  }
  throw new Error(`Timed out: ${description}`);
}

export function startHost(host, bindNativeTextInput, mountHost) {
  const mountPoint = document.querySelector('#host');
  const status = document.querySelector('#status');
  const active = new Map();
  const updates = new Map();
  const edits = [];
  let setupCount = 0;
  let disposeCount = 0;
  let driver;
  let result = 'Starting';
  const cases = [];
  const report = () => {
    const input = mountPoint.querySelector('input');
    status.textContent = `${host}: ${result}\nCases: ${cases.length}\nEdits: ${edits.length}\nActive bindings: ${active.size}\nSetups: ${setupCount}; disposals: ${disposeCount}\nValue: ${input?.value ?? '(unmounted)'}\n${cases.map((name) => `PASS ${name}`).join('\n')}`;
  };
  const tracker = {
    get activeCount() {
      return active.size;
    },
    attach(element, key) {
      const binding = bindNativeTextInput(element, (edit) => {
        edits.push({ key, ...edit });
        result = 'Native edit';
        report();
      });
      active.set(key, { element, binding });
      setupCount += 1;
      return () => {
        binding.dispose();
        if (active.get(key)?.binding === binding) active.delete(key);
        disposeCount += 1;
        report();
      };
    },
    update(key, value) {
      const owned = active.get(key);
      assert(owned, `Update before mount for ${key}`);
      const accepted = owned.binding.setValue(value);
      updates.set(key, { value, accepted });
      report();
      return accepted;
    },
  };
  const element = (key = 'primary') => {
    const input = mountPoint.querySelector(`input[name="${key}"]`);
    assert(input, `Missing ${key} input`);
    return input;
  };
  const form = () => mountPoint.querySelector('form');
  const mount = async () => {
    assert(!driver, 'Host already mounted');
    driver = await mountHost(mountPoint, tracker);
    await waitFor(() => active.size === 2, 'two mounted bindings');
    await pause();
  };
  const unmount = async () => {
    assert(driver, 'Host is not mounted');
    await driver.unmount();
    driver = undefined;
    await waitFor(() => active.size === 0, 'framework cleanup');
  };
  const request = async (key, value) => {
    assert(driver, 'Host is not mounted');
    updates.delete(key);
    await driver.update(key, value);
    await waitFor(() => updates.has(key), 'framework prop update');
    return updates.get(key).accepted;
  };
  const type = (input, value, isComposing = false) => {
    input.value = value;
    const event = new InputEvent('input', { bubbles: true, data: value, isComposing });
    input.dispatchEvent(event);
    return event;
  };
  const check = async (name, test) => {
    await test();
    cases.push(name);
  };
  const matrix = async () => {
    await mount();
    await check('native label and form ownership', async () => {
      assert(element().labels[0].control === element(), 'Label lost its native control');
      assert(new FormData(form()).get('primary') === 'default', 'Initial form value changed');
      assert(new FormData(form()).get('secondary') === 'default', 'Second form control missing');
      if (host === 'react') {
        assert(setupCount >= 4 && disposeCount >= 2, 'StrictMode setup/cleanup was not exercised');
      }
    });
    await check('one callback per edit and no property-write callback', async () => {
      const before = edits.length;
      element().value = 'property';
      assert(edits.length === before, 'Native value assignment emitted an edit');
      const event = type(element(), 'typed');
      assert(edits.length === before + 1, 'Input edit was lost or duplicated');
      assert(
        edits.at(-1).event === event && edits.at(-1).value === 'typed',
        'Edit payload changed',
      );
    });
    await check('framework value request without edit or default mutation', async () => {
      const before = edits.length;
      assert(await request('primary', 'remote'), 'Value request was refused');
      assert(element().value === 'remote', 'Framework request did not reach binding');
      assert(element().defaultValue === 'default', 'Default value was overwritten');
      assert(edits.length === before, 'Programmatic request emitted an edit');
      type(element(), 'fresh native text');
      assert(await request('secondary', 'secondary remote'), 'Secondary request was refused');
      assert(
        element().value === 'fresh native text',
        'Other field replayed a stale primary request',
      );
    });
    await check('same node focus and selection through rerender and same value', async () => {
      const input = element();
      input.focus();
      input.setSelectionRange(1, 3, 'backward');
      await driver.rerender();
      assert(await request('primary', input.value), 'Same value was refused');
      assert(
        element() === input && document.activeElement === input,
        'Rerender replaced node/focus',
      );
      assert(input.selectionStart === 1 && input.selectionEnd === 3, 'Selection changed');
      assert(input.selectionDirection === 'backward', 'Selection direction changed');
    });
    await check('composition refuses updates without replay and isolates controls', async () => {
      const input = element();
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      type(input, '한', true);
      assert(edits.at(-1).isComposing, 'Composition flag missing');
      const before = edits.length;
      assert(!(await request('primary', 'refused')), 'Composing replacement was accepted');
      assert(input.value === '한', 'Refused request changed native text');
      assert(await request('secondary', 'independent'), 'Other control inherited composition');
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' }));
      await driver.rerender();
      assert(input.value === '한', 'Refused request was replayed');
      assert(await request('secondary', 'after composition'), 'Secondary request was refused');
      assert(input.value === '한', 'Other field replayed a refused primary request');
      assert(edits.length === before, 'Composition end or programmatic update emitted an edit');
      assert(await request('primary', 'explicit retry'), 'Explicit retry failed');
    });
    await check('composing same value and blur release', async () => {
      const input = element();
      type(input, 'ㅁ', true);
      assert(await request('primary', 'ㅁ'), 'Composing same value was refused');
      assert(!(await request('primary', 'blocked')), 'Composing replacement was accepted');
      const before = edits.length;
      input.dispatchEvent(new Event('blur'));
      assert(await request('primary', 'after blur'), 'Blur did not release composing state');
      assert(edits.length === before, 'Blur/update emitted an edit');
    });
    await check('native reset required disabled and readOnly semantics', async () => {
      const before = edits.length;
      await request('primary', 'changed');
      form().reset();
      assert(element().value === 'default', 'Form reset did not restore default');
      assert(edits.length === before, 'Reset synthesized an edit');
      await request('primary', '');
      assert(element().validity.valueMissing, 'Required validity was lost');
      await request('primary', 'readonly');
      element().readOnly = true;
      assert(new FormData(form()).get('primary') === 'readonly', 'Read-only control excluded');
      element().disabled = true;
      assert(!new FormData(form()).has('primary'), 'Disabled control was submitted');
      element().disabled = false;
      element().readOnly = false;
    });
    await check('duplicate active binding is rejected', async () => {
      let rejected = false;
      try {
        const unexpected = bindNativeTextInput(element(), () => {});
        unexpected.dispose();
      } catch (error) {
        rejected = error instanceof Error;
      }
      assert(rejected, 'Duplicate active binding succeeded');
    });
    await check('framework unmount invalidates detached input and binding', async () => {
      const old = active.get('primary');
      const before = edits.length;
      await unmount();
      assert(!old.element.isConnected, 'Framework did not remove its input');
      assert(!old.binding.setValue('late'), 'Disposed binding accepted a write');
      type(old.element, 'detached');
      assert(edits.length === before, 'Detached old input still emitted an edit');
    });
    await check('three actual remount cycles without duplicate callbacks', async () => {
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await mount();
        const before = edits.length;
        type(element(), `cycle-${cycle}`);
        assert(edits.length === before + 1, 'Remount duplicated an edit');
        await unmount();
        assert(setupCount === disposeCount, 'Unmount leaked an active binding');
      }
    });
    await mount();
    result = 'PASS — interactive fixture ready';
    report();
    return { host, cases: [...cases], setupCount, disposeCount };
  };
  const runAction = (action) => async () => {
    try {
      await action();
      report();
    } catch (error) {
      result = `FAIL: ${error.message}`;
      report();
      throw error;
    }
  };
  document.querySelector('#remote').onclick = runAction(async () => {
    result = `Remote accepted: ${await request('primary', 'remote')}`;
  });
  document.querySelector('#selection').onclick = runAction(async () => {
    const input = element();
    input.focus();
    input.setSelectionRange(1, 3);
    await request('primary', input.value);
    result = `Selection: ${input.selectionStart}–${input.selectionEnd}; focused: ${document.activeElement === input}`;
  });
  document.querySelector('#unmount').onclick = runAction(async () => {
    await unmount();
    result = 'Unmounted';
  });
  document.querySelector('#mount').onclick = runAction(async () => {
    await mount();
    result = 'Mounted';
  });
  mountPoint.addEventListener('reset', () => {
    setTimeout(() => {
      result = 'Form reset';
      report();
    }, 0);
  });
  mountPoint.addEventListener('submit', (event) => event.preventDefault());
  const api = { host, ready: null };
  window.nativeInputFixture = api;
  api.ready = matrix().catch((error) => {
    result = `FAIL: ${error.message}`;
    report();
    throw error;
  });
}
