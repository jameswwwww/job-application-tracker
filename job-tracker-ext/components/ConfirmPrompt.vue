<script setup lang="ts">
defineProps<{
  company: string;
  jobTitle: string;
}>();

defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div
    class="fixed bottom-5 right-5 z-999999 w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white font-sans shadow-xl"
  >
    <div class="p-5">
      <!-- Header -->
      <div class="flex items-start gap-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="m-0 text-sm font-semibold text-gray-900">
            Did you finish applying?
          </h3>

          <p class="mb-0 mt-1 text-xs leading-5 text-gray-500">
            We detected an application attempt but couldn't confirm whether it
            was submitted.
          </p>
        </div>

        <button
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Dismiss"
          @click="$emit('cancel')"
        >
          <svg
            width="15"
            height="15"
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

      <!-- Job -->
      <div class="mt-4 rounded-xl bg-gray-50 px-3.5 py-3">
        <div class="truncate text-sm font-medium text-gray-800">
          {{ jobTitle }}
        </div>

        <div class="mt-1 truncate text-xs text-gray-500">
          {{ company }}
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          @click="$emit('cancel')"
        >
          Not yet
        </button>

        <button
          type="button"
          class="flex-1 cursor-pointer rounded-xl border-0 bg-blue-600 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-blue-700"
          @click="$emit('confirm')"
        >
          Yes, save it
        </button>
      </div>
    </div>
  </div>
</template>
