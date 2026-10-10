<script lang="ts">
  import { applyUpdateNow, updateState } from '../lib/updater.svelte';

  let applying = $state(false);

  async function apply() {
    applying = true;
    await applyUpdateNow();
  }
</script>

{#if updateState.status === 'apk'}
  <aside class="banner" role="status">
    <p>
      <strong>Neue App-Version {updateState.version}</strong><br />
      Diese Fassung muss einmal von Hand installiert werden. Deine Daten bleiben erhalten.
    </p>
    <!-- No target: the Android shell hands links to other sites to the browser, which downloads the file. -->
    <a class="btn primary" href={updateState.apkUrl}>Herunterladen</a>
  </aside>
{:else if updateState.status === 'bundleReady' && !updateState.dismissed}
  <aside class="banner" role="status">
    <p>
      <strong>Neue Fassung {updateState.version} ist geladen</strong><br />
      Sie wird beim nächsten Start der App aktiv.
    </p>
    <div class="row">
      <button type="button" class="btn primary" disabled={applying} onclick={apply}>Jetzt anwenden</button>
      <button type="button" class="btn" disabled={applying} onclick={() => (updateState.dismissed = true)}>Später</button>
    </div>
  </aside>
{/if}

<style>
  .banner {
    display: grid;
    gap: 12px;
    margin-bottom: 20px;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-left: 5px solid var(--gold);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
</style>
