<script lang="ts">
  let { label, value = $bindable(''), options }: { label: string; value?: string; options: string[] } = $props();

  const listId = `suggest-${crypto.randomUUID()}`;
</script>

<label class="field">
  <span>{label}</span>
  <input type="text" bind:value list={listId} autocomplete="off" />
  <datalist id={listId}>
    {#each options as option (option)}
      <option value={option}></option>
    {/each}
  </datalist>
</label>
