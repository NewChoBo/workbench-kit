/* global document, window */

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

export function startHost(host, bindNativeCheckbox, mountHost) {
  const mountPoint = document.querySelector('#host');
  const status = document.querySelector('#status');
  const active = new Map();
  const updates = new Map();
  const edits = [];
  const cases = [];
  let setupCount = 0;
  let disposeCount = 0;
  let driver;
  let result = 'Starting';
  let matrixComplete = false;
  const report = () => {
    const form = mountPoint.querySelector('form');
    const values = form ? new FormData(form) : undefined;
    const controls = fields.map((key) => {
      const input = mountPoint.querySelector(`input[name="${key}"]`);
      if (!input) return `${key}: (unmounted)`;
      return `${key}: checked=${input.checked}; mixed=${input.indeterminate}; disabled=${input.disabled}; focused=${document.activeElement === input}; form value=${values.has(key) ? values.get(key) : '(omitted)'}`;
    });
    status.textContent = `${host}: ${result}\nCases: ${cases.length}/12\nEdits: ${edits.length}\nActive bindings: ${active.size}\nSetups: ${setupCount}; disposals: ${disposeCount}\n${controls.join('\n')}\n${cases.map((name) => `PASS ${name}`).join('\n')}`;
  };
  const tracker = {
    get activeCount() {
      return active.size;
    },
    attach(element, key) {
      assert(!active.has(key), `Host attached ${key} before disposing its prior binding`);
      const binding = bindNativeCheckbox(element, (edit) => {
        edits.push({ key, ...edit });
        result = 'Native edit';
        report();
      });
      active.set(key, { element, binding });
      setupCount += 1;
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        binding.dispose();
        if (active.get(key)?.binding === binding) active.delete(key);
        disposeCount += 1;
        report();
      };
    },
    update(key, property, value) {
      const owned = active.get(key);
      assert(owned, `Update before mount for ${key}`);
      assert(property === 'checked' || property === 'indeterminate', 'Unknown checkbox property');
      const accepted =
        property === 'checked'
          ? owned.binding.setChecked(value)
          : owned.binding.setIndeterminate(value);
      updates.set(`${key}:${property}`, { value, accepted });
      report();
      return accepted;
    },
  };
  const element = (key = 'primary') => {
    const input = mountPoint.querySelector(`input[name="${key}"]`);
    assert(input, `Missing ${key} input`);
    return input;
  };
  const form = () => {
    const node = mountPoint.querySelector('form');
    assert(node, 'Missing native form');
    return node;
  };
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
  const request = async (key, property, value) => {
    assert(driver, 'Host is not mounted');
    const updateKey = `${key}:${property}`;
    updates.delete(updateKey);
    await driver.update(key, property, value);
    await waitFor(() => updates.has(updateKey), 'framework property update');
    const update = updates.get(updateKey);
    assert(update.value === value, `Host acknowledged a stale ${updateKey} request`);
    return update.accepted;
  };
  const check = async (name, test) => {
    await test();
    cases.push(name);
  };
  const matrix = async () => {
    await mount();
    await check('native labels defaults and StrictMode ownership', async () => {
      for (const key of fields) {
        const input = element(key);
        assert(
          input.labels.length === 1 && input.labels[0].control === input,
          'Label lost its native control',
        );
        assert(input.form === form() && input.type === 'checkbox', 'Native form or type changed');
        assert(
          input.checked && input.defaultChecked && input.hasAttribute('checked'),
          'Initial checked defaults changed',
        );
        assert(!input.indeterminate && input.required, 'Initial native properties changed');
      }
      assert(new FormData(form()).get('primary') === 'accepted', 'Custom form value changed');
      assert(
        element('secondary').value === 'on' && !element('secondary').hasAttribute('value'),
        'Default checkbox value changed',
      );
      assert(
        new FormData(form()).get('secondary') === 'on',
        'Default form value was not submitted',
      );
      if (host === 'react') {
        assert(setupCount >= 4 && disposeCount >= 2, 'StrictMode setup/cleanup was not exercised');
      }
    });
    await check('one original change per click after native input', async () => {
      const input = element();
      const before = edits.length;
      const order = [];
      let editsAtInput;
      let changeEvent;
      const onInput = () => {
        order.push('input');
        editsAtInput = edits.length;
      };
      const onChange = (event) => {
        order.push('change');
        changeEvent = event;
      };
      input.addEventListener('input', onInput);
      input.addEventListener('change', onChange);
      try {
        input.click();
        assert(order.join(',') === 'input,change', 'Native input/change order or count changed');
        assert(
          editsAtInput === before && edits.length === before + 1,
          'Edit was early, lost or duplicated',
        );
        const edit = edits.at(-1);
        assert(
          edit.key === 'primary' && edit.event === changeEvent,
          'Original change identity was lost',
        );
        assert(
          !edit.checked && !edit.indeterminate && edit.value === 'accepted',
          'Change snapshot changed',
        );
        assert(
          !changeEvent.defaultPrevented && !input.checked,
          'Binder canceled native activation',
        );
      } finally {
        input.removeEventListener('input', onInput);
        input.removeEventListener('change', onChange);
      }
    });
    await check('silent property writes preserve defaults and unrelated properties', async () => {
      const input = element();
      const before = edits.length;
      const attributes = [input.getAttribute('checked'), input.getAttribute('value')];
      let eventCount = 0;
      const onEvent = () => {
        eventCount += 1;
      };
      input.addEventListener('input', onEvent);
      input.addEventListener('change', onEvent);
      try {
        input.checked = true;
        input.indeterminate = true;
        assert(await request('primary', 'checked', false), 'Checked request was refused');
        assert(!input.checked && input.indeterminate, 'Checked request changed mixed state');
        assert(await request('primary', 'indeterminate', false), 'Mixed request was refused');
        assert(!input.checked && !input.indeterminate, 'Mixed request changed checked state');
        assert(await request('primary', 'checked', false), 'Same checked request was refused');
        assert(await request('primary', 'indeterminate', false), 'Same mixed request was refused');
        assert(edits.length === before && eventCount === 0, 'Property write synthesized an event');
        assert(
          input.defaultChecked && input.getAttribute('checked') === attributes[0],
          'Checked defaults changed',
        );
        assert(
          input.value === 'accepted' && input.getAttribute('value') === attributes[1],
          'Form value changed',
        );
        assert(
          input.name === 'primary' && input.required && !input.disabled && !input.readOnly,
          'Unrelated native properties changed',
        );
      } finally {
        input.removeEventListener('input', onEvent);
        input.removeEventListener('change', onEvent);
      }
    });
    await check('independent property and control requests never replay stale state', async () => {
      const primary = element();
      const secondary = element('secondary');
      const before = edits.length;
      await request('primary', 'checked', true);
      primary.click();
      assert(!primary.checked, 'Native click did not uncheck');
      await request('primary', 'indeterminate', true);
      assert(
        !primary.checked && primary.indeterminate,
        'Mixed request replayed stale checked state',
      );
      await request('secondary', 'checked', false);
      await request('secondary', 'indeterminate', true);
      assert(!primary.checked && primary.indeterminate, 'Other control replayed a primary request');
      primary.click();
      assert(
        primary.checked && !primary.indeterminate,
        'Native activation did not clear mixed state',
      );
      await request('primary', 'checked', true);
      assert(!primary.indeterminate, 'Checked request replayed stale mixed state');
      assert(
        !secondary.checked && secondary.indeterminate,
        'Primary request changed secondary state',
      );
      secondary.click();
      assert(secondary.checked && !secondary.indeterminate, 'Secondary activation failed');
      await request('primary', 'indeterminate', true);
      assert(
        secondary.checked && !secondary.indeterminate,
        'Primary request replayed stale secondary state',
      );
      assert(edits.length === before + 3, 'Requests emitted edits or native edits were duplicated');
    });
    await check('same node and focus survive rerender and same property requests', async () => {
      const input = element();
      input.click();
      const before = edits.length;
      const checked = input.checked;
      const mixed = input.indeterminate;
      input.focus();
      assert(document.activeElement === input, 'Native input did not receive focus');
      await driver.rerender();
      assert(
        element() === input && document.activeElement === input,
        'Rerender replaced node or focus',
      );
      assert(
        input.checked === checked && input.indeterminate === mixed,
        'Rerender replayed a stale property request',
      );
      assert(await request('primary', 'checked', checked), 'Same checked request was refused');
      assert(await request('primary', 'indeterminate', mixed), 'Same mixed request was refused');
      assert(
        element() === input && document.activeElement === input,
        'Rerender replaced node or focus',
      );
      assert(
        input.checked === checked && input.indeterminate === mixed,
        'Rerender changed checkbox state',
      );
      assert(edits.length === before, 'Rerender synthesized an edit');
    });
    await check('checked state alone controls native form submission', async () => {
      const before = edits.length;
      await request('primary', 'indeterminate', true);
      await request('primary', 'checked', false);
      assert(!new FormData(form()).has('primary'), 'Unchecked mixed control was submitted');
      await request('primary', 'checked', true);
      assert(element().indeterminate, 'Checked request cleared mixed state');
      assert(
        new FormData(form()).get('primary') === 'accepted',
        'Mixed checked value was encoded differently',
      );
      await request('secondary', 'checked', true);
      assert(new FormData(form()).get('secondary') === 'on', 'Default value was replaced');
      assert(
        element().value === 'accepted' && element('secondary').value === 'on',
        'Checked state replaced form values',
      );
      assert(edits.length === before, 'Form inspection or property request emitted an edit');
    });
    await check('native reset and canceled reset preserve mixed state without edits', async () => {
      const input = element();
      const before = edits.length;
      await request('primary', 'checked', false);
      await request('secondary', 'checked', false);
      await request('primary', 'indeterminate', true);
      form().reset();
      assert(
        input.checked && element('secondary').checked,
        'Reset did not restore checked defaults',
      );
      assert(input.indeterminate, 'Reset invented a mixed-state policy');
      await request('primary', 'checked', false);
      let canceledReset;
      form().addEventListener(
        'reset',
        (event) => {
          event.preventDefault();
          canceledReset = event;
        },
        { once: true },
      );
      form().reset();
      assert(canceledReset?.defaultPrevented, 'Reset cancellation was not exercised');
      assert(!input.checked && input.indeterminate, 'Canceled reset changed live state');
      assert(edits.length === before, 'Reset synthesized an edit');
    });
    await check('native required disabled and readOnly behavior remains intact', async () => {
      const input = element();
      const before = edits.length;
      await request('primary', 'checked', false);
      assert(input.validity.valueMissing, 'Unchecked required input was valid');
      await request('primary', 'checked', true);
      assert(!input.validity.valueMissing, 'Checked required input remained invalid');
      input.disabled = true;
      input.click();
      assert(input.checked && edits.length === before, 'Disabled input activated');
      assert(!new FormData(form()).has('primary'), 'Disabled control was submitted');
      assert(await request('primary', 'checked', false), 'Disabled property update was refused');
      assert(!input.checked && input.disabled, 'Disabled update changed native disabled state');
      input.disabled = false;
      input.readOnly = true;
      input.click();
      assert(
        input.checked && edits.length === before + 1,
        'ReadOnly incorrectly blocked native checkbox activation',
      );
      assert(
        new FormData(form()).get('primary') === 'accepted',
        'ReadOnly checked control was excluded',
      );
      input.readOnly = false;
    });
    await check('native label activation and canceled click rollback remain intact', async () => {
      const input = element();
      await request('primary', 'checked', false);
      await request('primary', 'indeterminate', true);
      const before = edits.length;
      input.labels[0].click();
      assert(input.checked && !input.indeterminate, 'Label did not activate its checkbox');
      assert(
        edits.length === before + 1 && edits.at(-1).checked && !edits.at(-1).indeterminate,
        'Label activation was lost or duplicated',
      );
      await request('primary', 'indeterminate', true);
      let canceledClick;
      input.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          canceledClick = event;
        },
        { once: true },
      );
      input.click();
      assert(canceledClick?.defaultPrevented, 'Click cancellation was not exercised');
      assert(
        input.checked && input.indeterminate,
        'Canceled click did not restore checked and mixed state',
      );
      assert(edits.length === before + 1, 'Canceled click emitted an edit');
    });
    await check('duplicate active binding is rejected without disturbing its owner', async () => {
      let rejected = false;
      let unexpected;
      try {
        unexpected = bindNativeCheckbox(element(), () => {});
      } catch (error) {
        rejected = error instanceof Error;
      }
      unexpected?.dispose();
      assert(rejected, 'Duplicate active binding succeeded');
      const before = edits.length;
      element().click();
      assert(edits.length === before + 1, 'Duplicate rejection disturbed the original binding');
    });
    await check('framework unmount disposes detached controls and both setters', async () => {
      const previous = fields.map((key) => active.get(key));
      const before = edits.length;
      await unmount();
      for (const old of previous) {
        assert(!old.element.isConnected, 'Framework did not remove its input');
        const checked = old.element.checked;
        const mixed = old.element.indeterminate;
        assert(!old.binding.setChecked(!checked), 'Disposed binding accepted checked update');
        assert(!old.binding.setIndeterminate(!mixed), 'Disposed binding accepted mixed update');
        assert(
          old.element.checked === checked && old.element.indeterminate === mixed,
          'Disposed setter changed native state',
        );
        old.element.click();
        old.element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      assert(edits.length === before, 'Detached old control still emitted an edit');
      assert(setupCount === disposeCount, 'Framework unmount leaked a binding');
    });
    await check('three actual remount cycles retain defaults and single callbacks', async () => {
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await mount();
        assert(
          element().checked && element('secondary').checked && !element().indeterminate,
          'Remount retained stale checkbox state',
        );
        const before = edits.length;
        element().click();
        element('secondary').click();
        assert(edits.length === before + 2, 'Remount lost or duplicated an edit');
        assert(
          edits.at(-2).key === 'primary' && edits.at(-1).key === 'secondary',
          'Remount crossed control callbacks',
        );
        await unmount();
        assert(setupCount === disposeCount && active.size === 0, 'Remount cycle leaked a binding');
      }
    });
    await mount();
    matrixComplete = true;
    result = 'PASS — interactive fixture ready';
    report();
    return { host, cases: [...cases], setupCount, disposeCount };
  };
  const runAction = (action) => async () => {
    try {
      await api.ready;
      await action();
      report();
    } catch (error) {
      result = `FAIL: ${error.message}`;
      report();
      throw error;
    }
  };
  document.querySelector('#remote').onclick = runAction(async () => {
    result = `Checked accepted: ${await request('primary', 'checked', true)}`;
  });
  document.querySelector('#mixed').onclick = runAction(async () => {
    result = `Mixed accepted: ${await request('primary', 'indeterminate', true)}`;
  });
  document.querySelector('#focus').onclick = runAction(async () => {
    const input = element();
    input.focus();
    await driver.rerender();
    assert(
      element() === input && document.activeElement === input,
      'Rerender replaced node or focus',
    );
    result = 'Same input remained focused through rerender';
  });
  document.querySelector('#disable').onclick = runAction(async () => {
    element().disabled = !element().disabled;
    result = `Disabled: ${element().disabled}`;
  });
  document.querySelector('#unmount').onclick = runAction(async () => {
    await unmount();
    result = 'Unmounted';
  });
  document.querySelector('#mount').onclick = runAction(async () => {
    await mount();
    result = 'Mounted';
  });
  mountPoint.addEventListener('focusin', report);
  mountPoint.addEventListener('focusout', report);
  mountPoint.addEventListener('reset', (event) => {
    setTimeout(() => {
      if (matrixComplete) result = event.defaultPrevented ? 'Form reset canceled' : 'Form reset';
      report();
    }, 0);
  });
  mountPoint.addEventListener('submit', (event) => event.preventDefault());
  const api = { host, ready: null };
  window.nativeCheckboxFixture = api;
  api.ready = matrix().catch((error) => {
    result = `FAIL: ${error.message}`;
    report();
    throw error;
  });
}
