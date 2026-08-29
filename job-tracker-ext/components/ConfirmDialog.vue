<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  confirmLabel?: string;
}>();

defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
    @click.self="$emit('cancel')"
  >
    <div
      class="w-full max-w-420px rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
    >
      <div
        class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 6h18" />

          <path d="M8 6V4h8v2" />

          <path d="M19 6l-1 14H6L5 6" />
        </svg>
      </div>

      <h2 class="mt-4 text-lg font-semibold text-slate-900">
        {{ title }}
      </h2>

      <p class="mt-1.5 text-sm leading-6 text-slate-500">
        {{ description }}
      </p>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="$emit('cancel')"
        >
          Cancel
        </button>

        <button
          type="button"
          class="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          @click="$emit('confirm')"
        >
          {{ confirmLabel || "Delete" }}
        </button>
      </div>
    </div>
  </div>
</template>
