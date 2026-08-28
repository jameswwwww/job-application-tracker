<script setup lang="ts">
defineProps<{
  company: string;
  jobTitle: string;
}>();

defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div
    class="fixed bottom-6 right-6 z-999999 w-[380px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)]"
  >
    <!-- Top accent -->
    <div class="h-1 w-full bg-blue-600" />

    <div class="p-5">
      <!-- Header -->
      <div class="flex items-start gap-3.5">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 11l3 3L22 4" />
            <path
              d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
            />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <h3
            class="m-0 text-[15px] font-semibold tracking-[-0.01em] text-slate-900"
          >
            Application submitted?
          </h3>

          <p class="mb-0 mt-1 text-[13px] leading-5 text-slate-500">
            We noticed an application attempt but couldn't confirm whether it
            was completed.
          </p>
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          @click="$emit('cancel')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <!-- Job -->
      <div
        class="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3.5"
      >
        <p class="m-0 truncate text-[13px] font-semibold text-slate-800">
          {{ jobTitle }}
        </p>

        <p class="mb-0 mt-1 truncate text-xs text-slate-500">
          {{ company }}
        </p>
      </div>

      <!-- Actions -->
      <div class="mt-5 flex gap-2.5">
        <button
          type="button"
          class="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          @click="$emit('cancel')"
        >
          Not yet
        </button>

        <button
          type="button"
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          @click="$emit('confirm')"
        >
          Yes, save it

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
