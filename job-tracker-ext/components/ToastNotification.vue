<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const visible = ref(false);

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

function close() {
  visible.value = false;
  setTimeout(() => emit("close"), 300);
}

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true;
  });

  autoCloseTimer = setTimeout(close, props.duration ?? 4000);
});

onUnmounted(() => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
});

function typeClasses() {
  switch (props.type) {
    case "error":
      return "bg-red-600 text-white";
    case "info":
      return "bg-slate-800 text-white";
    default:
      return "bg-emerald-600 text-white";
  }
}
</script>

<template>
  <div
    :class="[
      'pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300',
      typeClasses(),
      visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
    ]"
    role="alert"
  >
    <!-- Icon -->
    <svg
      v-if="type !== 'error'"
      width="16"
      height="16"
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
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      class="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>

    <span class="flex-1">{{ message }}</span>

    <button
      type="button"
      class="shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100"
      @click="close"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
</template>
