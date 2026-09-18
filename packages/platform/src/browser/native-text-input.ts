export interface NativeTextInputEdit {
  readonly value: string;
  readonly isComposing: boolean;
  readonly event: Event;
}

export interface NativeTextInputBinding {
  /** Returns false for disposed, unsupported or differing composing updates; never queues a value. */
  setValue(value: string): boolean;
  dispose(): void;
}

const activeInputs = new WeakSet<HTMLInputElement>();

/** Binds edits on an existing text input. The host owns the element and must dispose on unmount. */
export function bindNativeTextInput(
  input: HTMLInputElement,
  onEdit: (edit: NativeTextInputEdit) => void,
): NativeTextInputBinding {
  const InputConstructor =
    input?.ownerDocument?.defaultView?.HTMLInputElement ??
    (typeof HTMLInputElement === 'undefined' ? undefined : HTMLInputElement);
  if (!InputConstructor || !(input instanceof InputConstructor) || input.type !== 'text') {
    throw new TypeError('Expected a native text input');
  }
  if (typeof onEdit !== 'function') throw new TypeError('Expected an edit callback');
  if (activeInputs.has(input)) throw new Error('Text input already has an active binding');

  let disposed = false;
  let composing = false;
  const startComposition = () => {
    composing = true;
  };
  const endComposition = () => {
    composing = false;
  };
  const edit = (event: Event) => {
    if (disposed || input.type !== 'text') return;
    if ((event as InputEvent).isComposing === true) composing = true;
    onEdit({ value: input.value, isComposing: composing, event });
  };

  input.addEventListener('input', edit);
  input.addEventListener('compositionstart', startComposition);
  input.addEventListener('compositionend', endComposition);
  input.addEventListener('blur', endComposition);
  activeInputs.add(input);

  return {
    setValue(value) {
      if (typeof value !== 'string') throw new TypeError('Expected a string value');
      if (disposed || input.type !== 'text') return false;
      if (input.value === value) return true;
      if (composing) return false;
      input.value = value;
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      composing = false;
      input.removeEventListener('input', edit);
      input.removeEventListener('compositionstart', startComposition);
      input.removeEventListener('compositionend', endComposition);
      input.removeEventListener('blur', endComposition);
      activeInputs.delete(input);
    },
  };
}
