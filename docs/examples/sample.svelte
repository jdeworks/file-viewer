<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import Counter from './Counter.svelte';
  import Modal from './Modal.svelte';

  export let title: string = 'Hello';
  export let maxCount: number = 10;
  export let items: string[] = [];

  const theme = writable('light');

  let count = 0;
  let showModal = false;

  $: doubled = count * 2;
  $: isMaxed = count >= maxCount;
  $: label = isMaxed ? 'Max reached' : `Count: ${count}`;

  function increment() {
    if (!isMaxed) count += 1;
  }

  function reset() {
    count = 0;
    showModal = false;
  }

  onMount(() => {
    console.log('Component mounted');
  });
</script>

<style lang="scss">
  .container {
    padding: 1rem;
    background: var(--bg, #fff);
    border-radius: 8px;

    h1 {
      font-size: 1.5rem;
      color: var(--fg, #333);
    }
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
    }
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    background: #0070f3;
    color: white;
    font-size: 0.75rem;
  }
</style>

<div class="container">
  <h1>{title}</h1>
  <p>Theme: {$theme}</p>

  {#if items.length > 0}
    <ul>
      {#each items as item, i}
        <li>
          <span class="badge">{i + 1}</span>
          {item}
        </li>
      {/each}
    </ul>
  {:else}
    <p>No items yet.</p>
  {/if}

  <p>{label} (doubled: {doubled})</p>

  <button on:click={increment} disabled={isMaxed}>
    Increment
  </button>
  <button on:click={() => (showModal = true)}>
    Reset
  </button>

  <Counter bind:value={count} />

  {#if showModal}
    <Modal on:close={reset}>
      <svelte:fragment slot="title">Confirm reset</svelte:fragment>
      <p>Are you sure you want to reset the counter?</p>
      <button on:click={reset}>Yes, reset</button>
    </Modal>
  {/if}

  <slot name="footer" />
  <slot />
</div>
