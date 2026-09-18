import { bindNativeTextInput } from '../../../packages/platform/src/browser/native-text-input';

const input = document.querySelector<HTMLInputElement>('#sample')!;
const form = document.querySelector<HTMLFormElement>('#sample-form')!;
const status = document.querySelector<HTMLElement>('#status')!;
const disposeButton = document.querySelector<HTMLButtonElement>('#dispose')!;
const rebindButton = document.querySelector<HTMLButtonElement>('#rebind')!;
let edits = 0;
let composing = false;
let active = true;
let result = 'Ready';
function report() {
  status.textContent = `${result}\nValue: ${input.value}\nEdits: ${edits}\nLast edit composing: ${composing}\nBinding: ${active ? 'active' : 'disposed'}\nFocused: ${document.activeElement === input}\nForm value: ${new FormData(form).get('sample')}`;
}
function bind() {
  return bindNativeTextInput(input, (edit) => {
    edits += 1;
    composing = edit.isComposing;
    result = 'Native edit';
    report();
  });
}
let binding = bind();
input.addEventListener('focus', report);
input.addEventListener('blur', report);
form.addEventListener('reset', () =>
  requestAnimationFrame(() => {
    result = 'Form reset';
    report();
  }),
);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  result = 'Form read';
  report();
});
document.querySelector('#remote')!.addEventListener('click', () => {
  result = `Remote assignment accepted: ${binding.setValue('remote')}`;
  report();
});
document.querySelector('#selection')!.addEventListener('click', () => {
  input.focus();
  input.setSelectionRange(1, 3);
  const node = input;
  binding.setValue(input.value);
  result = `Same node: ${node === form.querySelector('input')}; selection: ${input.selectionStart}–${input.selectionEnd}`;
  report();
});
document.querySelector('#duplicate')!.addEventListener('click', () => {
  try {
    const duplicate = bindNativeTextInput(input, () => {});
    duplicate.dispose();
    result = 'Duplicate accepted';
  } catch {
    result = 'Duplicate rejected';
  }
  report();
});
disposeButton.addEventListener('click', () => {
  binding.dispose();
  active = false;
  disposeButton.disabled = true;
  rebindButton.disabled = false;
  result = 'Disposed';
  report();
});
rebindButton.addEventListener('click', () => {
  binding = bind();
  active = true;
  disposeButton.disabled = false;
  rebindButton.disabled = true;
  result = 'Rebound';
  report();
});
report();
