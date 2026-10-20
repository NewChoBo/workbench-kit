export const source = `
<script>
  import { onMount } from 'svelte';
  export let tracker;
  let presentation = tracker.presentation;
  let titleRow;
  let enabledRow;
  export function updatePresentation(next) { presentation = next; }
  onMount(() => {
    const title = tracker.attach('title', titleRow);
    const enabled = tracker.attach('enabled', enabledRow);
    return () => { title(); enabled(); };
  });
</script>
<form>
  <div class="ui-native-property-row" bind:this={titleRow}>
    <!-- svelte-ignore a11y_label_has_associated_control (the shared binder owns label association) -->
    <label class="ui-native-property-row__label">Display name</label>
    <div class="ui-native-property-row__control"><input type="text" id="title" name="title" value="Workspace" aria-describedby="external-help" aria-invalid="grammar" /></div>
    {#if presentation.title.description}{#key presentation.title.generation}<p id={\`title-help-\${presentation.title.generation}\`} data-description class="ui-native-property-row__description">{presentation.title.description}</p>{/key}{/if}
    {#if presentation.title.error}<p id="title-error" data-error class="ui-native-property-row__error">{presentation.title.error}</p>{/if}
  </div>
  <div class="ui-native-property-row ui-native-property-row--checkbox" bind:this={enabledRow}>
    <!-- svelte-ignore a11y_label_has_associated_control (the shared binder owns label association) -->
    <label class="ui-native-property-row__label">Show details</label>
    <div class="ui-native-property-row__control"><input type="checkbox" id="enabled" name="enabled" checked value="yes" aria-describedby="external-help" aria-invalid="grammar" /></div>
    {#if presentation.enabled.description}{#key presentation.enabled.generation}<p id={\`enabled-help-\${presentation.enabled.generation}\`} data-description class="ui-native-property-row__description">{presentation.enabled.description}</p>{/key}{/if}
    {#if presentation.enabled.error}<p id="enabled-error" data-error class="ui-native-property-row__error">{presentation.enabled.error}</p>{/if}
  </div>
</form>
`;
