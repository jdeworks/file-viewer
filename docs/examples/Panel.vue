<template>
  <section class="sample-panel">
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="item in visibleItems" :key="item.name">
        <strong>{{ item.name }}</strong>
        <span>{{ item.type }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: 'Recent samples' },
  items: { type: Array, default: () => [] },
});

const visibleItems = computed(() => props.items.filter((item) => !item.hidden));
</script>

<style scoped>
.sample-panel {
  border: 1px solid #d7dde8;
  padding: 1rem;
}
</style>
