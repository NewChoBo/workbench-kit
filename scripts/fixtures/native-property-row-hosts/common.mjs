/* global document, window */
export const fields = [
  { id: 'title', label: 'Display name', type: 'text' },
  { id: 'enabled', label: 'Show details', type: 'checkbox' },
];
export const initialPresentation = () => ({
  title: { description: 'A visible name for this workspace.', generation: 0 },
  enabled: { description: 'Include details in the preview.', generation: 0 },
});
export const pause = () => new Promise((resolve) => setTimeout(resolve, 5));
export async function waitFor(predicate, label) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await pause();
  }
  throw new Error(`Timed out: ${label}`);
}
function targets(root) {
  const description = root.querySelector('[data-description]');
  const error = root.querySelector('[data-error]');
  return { ...(description ? { description } : {}), ...(error ? { error } : {}) };
}
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const equal = (actual, expected, message) =>
  check(JSON.stringify(actual) === JSON.stringify(expected), message);

export function startHost(host, bindRow, mount) {
  const entries = new Map();
  const tracker = {
    presentation: initialPresentation(),
    edits: 0,
    get activeCount() {
      return entries.size;
    },
    attach(id, root) {
      check(!entries.has(id), 'Duplicate renderer attachment');
      const control = root.querySelector('input');
      const label = root.querySelector('label');
      const binding = bindRow({ control, label, ...targets(root) });
      const onEdit = () => {
        tracker.edits += 1;
      };
      const eventName = control.type === 'checkbox' ? 'change' : 'input';
      control.addEventListener(eventName, onEdit);
      const entry = { root, control, label, binding };
      entries.set(id, entry);
      return () => {
        binding.dispose();
        control.removeEventListener(eventName, onEdit);
        if (entries.get(id) === entry) entries.delete(id);
      };
    },
    refresh(id) {
      const entry = entries.get(id);
      if (entry) entry.binding.update(targets(entry.root));
    },
    refreshAll() {
      for (const id of entries.keys()) tracker.refresh(id);
    },
    get(id) {
      return entries.get(id);
    },
  };
  const target = document.getElementById('host');
  let mounted;
  const mountHost = async () => {
    if (mounted) return;
    mounted = await mount(target, tracker);
    await waitFor(() => tracker.activeCount === 2, `${host} mount`);
  };
  const unmountHost = async () => {
    if (!mounted) return;
    const old = mounted;
    mounted = undefined;
    await old.unmount();
    equal(tracker.activeCount, 0, `${host} leaked bindings`);
  };
  const update = async (presentation) => {
    tracker.presentation = presentation;
    if (mounted) await mounted.update(presentation);
  };
  const patch = async (id, changes) =>
    update({ ...tracker.presentation, [id]: { ...tracker.presentation[id], ...changes } });
  const readTokens = (control) => control.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  const ready = (async () => {
    const cases = [];
    const run = async (name, callback) => {
      await callback();
      cases.push(name);
    };
    await mountHost();
    await run('native label and help association with retained foreign metadata', async () => {
      for (const { id } of fields) {
        const { label, control } = tracker.get(id);
        check(label.control === control, `${id} label target`);
        equal(readTokens(control), ['external-help', `${id}-help-0`], `${id} descriptions`);
        equal(control.getAttribute('aria-invalid'), 'grammar', 'Initial host validity metadata');
      }
    });
    await run('error add update and complete-snapshot clear', async () => {
      await patch('title', { error: 'A display name needs attention.' });
      const { control } = tracker.get('title');
      equal(control.getAttribute('aria-invalid'), 'true', 'Error invalidity');
      equal(
        readTokens(control),
        ['external-help', 'title-help-0', 'title-error'],
        'Error association',
      );
      await patch('title', { error: 'Use a different display name.' });
      equal(
        tracker.get('title').root.querySelector('[data-error]').textContent,
        'Use a different display name.',
        'Error text update',
      );
      await patch('title', { error: undefined });
      equal(control.getAttribute('aria-invalid'), 'grammar', 'Error baseline restore');
      check(!readTokens(control).includes('title-error'), 'Stale error token');
    });
    await run(
      'typed value selection focus and input reference survive metadata changes',
      async () => {
        const { control } = tracker.get('title');
        control.value = 'Retained edit';
        control.focus();
        control.setSelectionRange(2, 6);
        const edits = tracker.edits;
        await patch('title', {
          error: 'Review the retained edit.',
          description: 'Updated instructions.',
        });
        check(
          tracker.get('title').control === control && document.activeElement === control,
          'Input identity or focus changed',
        );
        equal(
          [control.value, control.selectionStart, control.selectionEnd],
          ['Retained edit', 2, 6],
          'Value or selection changed',
        );
        equal(tracker.edits, edits, 'Metadata synthesized edit');
      },
    );
    await run('renderer target replacement removes old owned IDs', async () => {
      const old = tracker.get('title').root.querySelector('[data-description]');
      await patch('title', { generation: 1, description: 'Replacement help.' });
      const current = tracker.get('title');
      check(
        current.root.querySelector('[data-description]') !== old,
        'Renderer did not replace target',
      );
      equal(
        readTokens(current.control),
        ['external-help', 'title-help-1', 'title-error'],
        'Replacement association',
      );
    });
    await run('native checkbox label activation and mixed state remain native', async () => {
      const { control, label } = tracker.get('enabled');
      control.indeterminate = true;
      const edits = tracker.edits;
      label.click();
      check(
        !control.checked && !control.indeterminate,
        'Native activation did not toggle/clear mixed state',
      );
      equal(tracker.edits, edits + 1, 'Native checkbox edit count');
      control.indeterminate = true;
      await patch('enabled', { error: 'Review this choice.' });
      check(!control.checked && control.indeterminate, 'Metadata changed checkbox properties');
    });
    await run('later external metadata survives update and error cleanup', async () => {
      const { control } = tracker.get('title');
      control.setAttribute(
        'aria-describedby',
        `later-help ${control.getAttribute('aria-describedby')}`,
      );
      control.setAttribute('aria-invalid', 'spelling');
      await patch('title', { error: undefined, description: undefined });
      equal(readTokens(control), ['later-help', 'external-help'], 'External descriptions lost');
      equal(control.getAttribute('aria-invalid'), 'spelling', 'External invalidity lost');
    });
    await run('rows remain independent', async () => {
      const enabled = tracker.get('enabled').control;
      const before = [
        enabled.getAttribute('aria-describedby'),
        enabled.getAttribute('aria-invalid'),
        enabled.checked,
        enabled.indeterminate,
      ];
      await patch('title', { error: 'Name error only.' });
      equal(
        [
          enabled.getAttribute('aria-describedby'),
          enabled.getAttribute('aria-invalid'),
          enabled.checked,
          enabled.indeterminate,
        ],
        before,
        'Another row changed',
      );
    });
    await run('form submission reset and validity stay native', async () => {
      const form = target.querySelector('form');
      const title = tracker.get('title').control;
      const checkbox = tracker.get('enabled').control;
      equal(new FormData(form).get('title'), 'Retained edit', 'Form text value changed');
      check(!new FormData(form).has('enabled'), 'Unchecked checkbox submitted');
      title.setCustomValidity('Host validation');
      await patch('title', { error: undefined });
      check(!title.checkValidity(), 'Row cleared custom validity');
      title.setCustomValidity('');
      const edits = tracker.edits;
      form.reset();
      equal(title.value, 'Workspace', 'Reset default value');
      check(checkbox.checked, 'Reset checked value');
      equal(tracker.edits, edits, 'Reset synthesized edit');
      checkbox.disabled = true;
      check(!new FormData(form).has('enabled'), 'Disabled checkbox submitted');
      checkbox.disabled = false;
    });
    await run('unrelated renderer updates keep the focused native node', async () => {
      const { control } = tracker.get('title');
      control.focus();
      await update({ ...tracker.presentation });
      check(
        document.activeElement === control && tracker.get('title').control === control,
        'Rerender replaced input',
      );
    });
    await run('duplicate binding is rejected without changing live metadata', async () => {
      const { control, label } = tracker.get('title');
      const before = control.outerHTML;
      let rejected = false;
      try {
        bindRow({ control, label });
      } catch {
        rejected = true;
      }
      check(rejected, 'Duplicate binding accepted');
      equal(control.outerHTML, before, 'Duplicate binding mutated control');
    });
    await run('actual unmount cleans metadata and listeners', async () => {
      const title = tracker.get('title').control;
      const label = tracker.get('title').label;
      await unmountHost();
      equal(label.getAttribute('for'), null, 'Label association retained');
      equal(
        readTokens(title),
        ['later-help', 'external-help'],
        'Owned descriptions survived disposal',
      );
      equal(title.getAttribute('aria-invalid'), 'spelling', 'Foreign invalidity overwritten');
      const edits = tracker.edits;
      title.dispatchEvent(new Event('input', { bubbles: true }));
      equal(tracker.edits, edits, 'Unmount retained observer');
    });
    await run('three actual remounts leave exactly two live bindings', async () => {
      await update(initialPresentation());
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await mountHost();
        equal(tracker.activeCount, 2, 'Incorrect live binding count');
        if (cycle !== 2) await unmountHost();
      }
    });
    document.getElementById('status').textContent = `${host}: ${cases.length} cases passed`;
    return { host, cases };
  })();
  document.getElementById('error-on').onclick = () =>
    update(
      Object.fromEntries(
        fields.map(({ id }) => [id, { ...tracker.presentation[id], error: `Review ${id}.` }]),
      ),
    );
  document.getElementById('error-off').onclick = () =>
    update(
      Object.fromEntries(
        fields.map(({ id }) => [id, { ...tracker.presentation[id], error: undefined }]),
      ),
    );
  document.getElementById('unmount').onclick = () => unmountHost();
  document.getElementById('mount').onclick = () => mountHost();
  document.getElementById('reset').onclick = () => target.querySelector('form')?.reset();
  window.nativePropertyRowFixture = {
    ready,
    tracker,
    update,
    patch,
    mount: mountHost,
    unmount: unmountHost,
  };
  ready.catch((error) => {
    document.getElementById('status').textContent = String(error);
  });
}
