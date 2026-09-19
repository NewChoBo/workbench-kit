export const source = `
<script>
  import { onMount } from 'svelte';
  export let tracker;
  let primary;
  let secondary;
  let primaryRequest;
  let secondaryRequest;
  let revision = 0;
  export function request(key, property, value) {
    if (key === 'primary') primaryRequest = { property, value };
    else secondaryRequest = { property, value };
  }
  export function rerender() { revision += 1; }
  onMount(() => {
    const primaryCleanup = tracker.attach(primary, 'primary');
    const secondaryCleanup = tracker.attach(secondary, 'secondary');
    return () => { primaryCleanup(); secondaryCleanup(); };
  });
  $: if (primary && primaryRequest) tracker.update('primary', primaryRequest.property, primaryRequest.value);
  $: if (secondary && secondaryRequest) tracker.update('secondary', secondaryRequest.property, secondaryRequest.value);
</script>
<form data-appearance={revision % 2 ? 'alternate' : 'normal'}>
  <label for="primary">primary checkbox</label>
  <input bind:this={primary} id="primary" name="primary" type="checkbox" checked value="accepted" required />
  <label for="secondary">secondary checkbox</label>
  <input bind:this={secondary} id="secondary" name="secondary" type="checkbox" checked required />
  <button type="reset">Reset form</button>
</form>
`;
