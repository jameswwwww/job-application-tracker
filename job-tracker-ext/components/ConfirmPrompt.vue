<script setup lang="ts">
defineProps<{
  company: string;
  jobTitle: string;
}>();

defineEmits(["confirm", "cancel"]);
</script>

<template>
  <!-- Fixed positioning ensures it floats above the job board UI -->
  <div
    class="fixed bottom-6 right-6 z-999999 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 font-sans"
    style="font-family: system-ui, sans-serif"
  >
    <div class="flex items-center space-x-2 mb-2">
      <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <h3 class="text-sm font-bold text-gray-800 m-0">Application Detected</h3>
    </div>

    <p class="text-xs text-gray-600 mb-4 leading-relaxed">
      Did you finish applying for the <strong>{{ jobTitle }}</strong> role at
      <strong>{{ company }}</strong
      >?
    </p>

    <div class="flex space-x-2">
      <button
        @click="$emit('confirm')"
        class="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors border-0 cursor-pointer"
      >
        Yes, Save it
      </button>
      <button
        @click="$emit('cancel')"
        class="flex-1 bg-gray-100 text-gray-700 text-xs font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors border-0 cursor-pointer"
      >
        No, Cancel
      </button>
    </div>
  </div>
</template>
