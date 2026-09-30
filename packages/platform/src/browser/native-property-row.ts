export interface NativePropertyRowTargets {
  readonly description?: HTMLElement;
  readonly error?: HTMLElement;
}

export interface NativePropertyRowElements extends NativePropertyRowTargets {
  readonly control: HTMLInputElement;
  readonly label: HTMLLabelElement;
}

export interface NativePropertyRowBinding {
  /** Replaces the complete target snapshot without changing renderer-owned nodes or values. */
  update(targets: NativePropertyRowTargets): boolean;
  dispose(): void;
}

const activeControls = new WeakSet<HTMLInputElement>();
const activeLabels = new WeakSet<HTMLLabelElement>();

/**
 * Associates renderer-owned native controls and metadata. The host owns unique stable IDs,
 * meaningful text, visibility, values, validation policy and explicit cleanup on unmount.
 */
export function bindNativePropertyRow(
  elements: NativePropertyRowElements,
): NativePropertyRowBinding {
  if (!elements || typeof elements !== 'object') throw new TypeError('Expected row elements');
  const { control, label } = elements;
  const Input =
    control?.ownerDocument?.defaultView?.HTMLInputElement ??
    (typeof HTMLInputElement === 'undefined' ? undefined : HTMLInputElement);
  const Label =
    label?.ownerDocument?.defaultView?.HTMLLabelElement ??
    (typeof HTMLLabelElement === 'undefined' ? undefined : HTMLLabelElement);
  if (!Input || !(control instanceof Input) || !supportsControl(control)) {
    throw new TypeError('Expected a native text input or checkbox');
  }
  if (!Label || !(label instanceof Label)) throw new TypeError('Expected a native label');
  const controlId = readId(control);
  const initialTargets = readTargets(elements);
  assertSameTree(control, label, initialTargets.elements);
  if (activeControls.has(control) || activeLabels.has(label)) {
    throw new Error('Property row control or label already has an active binding');
  }

  const originalFor = label.getAttribute('for');
  const originalDescriptions = control.getAttribute('aria-describedby');
  const originalTokens = tokens(originalDescriptions);
  let ownedTokens = new Set<string>();
  let errorActive = false;
  let invalidBaseline: string | null = null;
  let disposed = false;

  function applyDescriptions(nextIds: readonly string[]) {
    const remaining = tokens(control.getAttribute('aria-describedby')).filter(
      (id) => !ownedTokens.has(id),
    );
    const added = new Set<string>();
    for (const id of nextIds) {
      if (!remaining.includes(id)) {
        remaining.push(id);
        added.add(id);
      }
    }
    ownedTokens = added;
    const unchangedBaseline =
      remaining.length === originalTokens.length &&
      remaining.every((id, index) => id === originalTokens[index]);
    setAttribute(
      control,
      'aria-describedby',
      unchangedBaseline ? originalDescriptions : remaining.length ? remaining.join(' ') : null,
    );
  }

  function applyError(active: boolean) {
    if (active === errorActive) return;
    if (active) {
      invalidBaseline = control.getAttribute('aria-invalid');
      setAttribute(control, 'aria-invalid', 'true');
    } else if (control.getAttribute('aria-invalid') === 'true') {
      setAttribute(control, 'aria-invalid', invalidBaseline);
    }
    errorActive = active;
  }

  setAttribute(label, 'for', controlId);
  applyDescriptions(initialTargets.ids);
  applyError(initialTargets.errorActive);
  activeControls.add(control);
  activeLabels.add(label);

  return {
    update(targets) {
      const next = readTargets(targets);
      if (disposed || !supportsControl(control)) return false;
      if (control.id !== controlId) throw new TypeError('Bound control ID must remain stable');
      assertSameTree(control, label, next.elements);
      applyDescriptions(next.ids);
      applyError(next.errorActive);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      applyDescriptions([]);
      applyError(false);
      if (label.getAttribute('for') === controlId) setAttribute(label, 'for', originalFor);
      activeControls.delete(control);
      activeLabels.delete(label);
    },
  };
}

function supportsControl(control: HTMLInputElement): boolean {
  return control.type === 'text' || control.type === 'checkbox';
}

function readId(element: HTMLElement): string {
  if (!element.id || /\s/.test(element.id)) throw new TypeError('Expected a nonempty ID token');
  return element.id;
}

function readTargets(targets: NativePropertyRowTargets) {
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
    throw new TypeError('Expected a description/error target snapshot');
  }
  const { description, error } = targets;
  const elements: HTMLElement[] = [];
  const ids: string[] = [];
  for (const target of [description, error]) {
    if (target === undefined) continue;
    const Element =
      target?.ownerDocument?.defaultView?.HTMLElement ??
      (typeof HTMLElement === 'undefined' ? undefined : HTMLElement);
    if (!Element || !(target instanceof Element)) throw new TypeError('Expected an HTML target');
    elements.push(target);
    const id = readId(target);
    if (!ids.includes(id)) ids.push(id);
  }
  return { elements, ids, errorActive: error !== undefined };
}

function assertSameTree(
  control: HTMLInputElement,
  label: HTMLLabelElement,
  targets: readonly HTMLElement[],
) {
  const root = control.getRootNode();
  for (const element of [label, ...targets]) {
    if (element.ownerDocument !== control.ownerDocument || element.getRootNode() !== root) {
      throw new TypeError('Property row elements must belong to one DOM tree');
    }
  }
}

function tokens(value: string | null): string[] {
  return [...new Set(value?.split(/\s+/).filter(Boolean) ?? [])];
}

function setAttribute(element: HTMLElement, name: string, value: string | null) {
  if (element.getAttribute(name) === value) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}
