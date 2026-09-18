export const source = `
<script>
  import { onMount } from 'svelte';
  export let tracker;
  let primary;
  let secondary;
  let primaryRequest;
  let secondaryRequest;
  let revision = 0;
  export function request(key, value) {
    if (key === 'primary') primaryRequest = { value };
    else secondaryRequest = { value };
  }
  export function rerender() { revision += 1; }
  onMount(() => {
    const primaryCleanup = tracker.attach(primary, 'primary');
    const secondaryCleanup = tracker.attach(secondary, 'secondary');
    return () => { primaryCleanup(); secondaryCleanup(); };
  });
  $: if (primary && primaryRequest) tracker.update('primary', primaryRequest.value);
  $: if (secondary && secondaryRequest) tracker.update('secondary', secondaryRequest.value);
</script>
<form data-appearance={revision % 2 ? 'alternate' : 'normal'}>
  <label for="primary">primary value</label>
  <input bind:this={primary} id="primary" name="primary" type="text" value="default" required />
  <label for="secondary">secondary value</label>
  <input bind:this={secondary} id="secondary" name="secondary" type="text" value="default" required />
  <button type="reset">Reset form</button>
</form>
`;
