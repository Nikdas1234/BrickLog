<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    title,
    message = '',
    confirmLabel = 'OK',
    danger = false,
    onconfirm,
    children,
  }: {
    open?: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    danger?: boolean;
    // Returning false keeps the dialog open, e.g. after a validation error.
    onconfirm: () => void | boolean | Promise<void | boolean>;
    children?: Snippet;
  } = $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  async function confirm() {
    if ((await onconfirm()) !== false) open = false;
  }
</script>

<dialog bind:this={dialog} onclose={() => (open = false)}>
  <h2>{title}</h2>
  {#if message}<p>{message}</p>{/if}
  {@render children?.()}
  <div class="actions">
    <button type="button" class="btn" onclick={() => (open = false)}>Abbrechen</button>
    <button type="button" class="btn {danger ? 'danger solid' : 'primary'}" onclick={confirm}>{confirmLabel}</button>
  </div>
</dialog>

<style>
  dialog {
    width: min(100vw - 32px, 420px);
    padding: 20px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    color: var(--text);
  }

  dialog[open] {
    display: grid;
    gap: 14px;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
</style>
