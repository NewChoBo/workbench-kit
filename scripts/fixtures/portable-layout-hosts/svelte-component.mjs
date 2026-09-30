export const source = `
<script>
  import { onMount } from 'svelte';
  export let model;
  let snapshot = model.snapshot();
  onMount(() => model.subscribe(value => { snapshot = value; }));
</script>
{#each model.controls as [id, label, run] (id)}
  <button type="button" data-action={id} onclick={run}>{label}</button>
{/each}
<pre data-state>{JSON.stringify(snapshot)}</pre>
`;
