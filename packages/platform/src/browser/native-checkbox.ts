export interface NativeCheckboxEdit {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly value: string;
  readonly event: Event;
}

export interface NativeCheckboxBinding {
  /** Silently sets checked; returns false while disposed or no longer a checkbox. */
  setChecked(checked: boolean): boolean;
  /** Silently sets the native visual state without changing checked or form value. */
  setIndeterminate(indeterminate: boolean): boolean;
  dispose(): void;
}

const activeInputs = new WeakSet<HTMLInputElement>();

/** Binds native changes. The host owns markup, commit policy and explicit disposal on unmount. */
export function bindNativeCheckbox(
  input: HTMLInputElement,
  onEdit: (edit: NativeCheckboxEdit) => void,
): NativeCheckboxBinding {
  const InputConstructor =
    input?.ownerDocument?.defaultView?.HTMLInputElement ??
    (typeof HTMLInputElement === 'undefined' ? undefined : HTMLInputElement);
  if (!InputConstructor || !(input instanceof InputConstructor) || input.type !== 'checkbox') {
    throw new TypeError('Expected a native checkbox');
  }
  if (typeof onEdit !== 'function') throw new TypeError('Expected an edit callback');
  if (activeInputs.has(input)) throw new Error('Checkbox already has an active binding');

  let disposed = false;
  const edit = (event: Event) => {
    if (disposed || input.type !== 'checkbox') return;
    onEdit({
      checked: input.checked,
      indeterminate: input.indeterminate,
      value: input.value,
      event,
    });
  };
  input.addEventListener('change', edit);
  activeInputs.add(input);

  return {
    setChecked(checked) {
      if (typeof checked !== 'boolean') throw new TypeError('Expected a boolean checked value');
      if (disposed || input.type !== 'checkbox') return false;
      if (input.checked === checked) return true;
      input.checked = checked;
      return true;
    },
    setIndeterminate(indeterminate) {
      if (typeof indeterminate !== 'boolean') {
        throw new TypeError('Expected a boolean indeterminate value');
      }
      if (disposed || input.type !== 'checkbox') return false;
      if (input.indeterminate === indeterminate) return true;
      input.indeterminate = indeterminate;
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      input.removeEventListener('change', edit);
      activeInputs.delete(input);
    },
  };
}
