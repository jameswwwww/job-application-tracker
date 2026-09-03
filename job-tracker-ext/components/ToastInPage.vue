<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  message: string;
  duration?: number;
  type?: "success" | "warning";
}>();

const visible = ref(false);

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true;
  });

  setTimeout(() => {
    visible.value = false;
  }, props.duration ?? 3500);
});
</script>

<template>
  <div
    :class="[
      'pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-all duration-300',
      type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
    ]"
    role="alert"
    style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2147483647;"
  >
    <svg
      v-if="type !== 'warning'"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      class="shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>

    <svg
      v-else
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      class="shrink-0"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
    </svg>

    <span>{{ message }}</span>
  </div>
</template>
