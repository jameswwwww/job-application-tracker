<script setup lang="ts">
import { ref, onMounted } from "vue";
import { db } from "../../src/services/db";
import type { JobApplication } from "../../src/types";

const applications = ref<JobApplication[]>([]);

const openDashboard = () => {
  // Opens the full-page dashboard in a new Chrome tab
  browser.tabs.create({ url: browser.runtime.getURL("/dashboard.html") });
};

const addManualApplication = () => {
  browser.tabs.create({
    url: browser.runtime.getURL("/dashboard.html") + "?action=add",
  });
};

onMounted(async () => {
  // Fetch all saved applications from IndexedDB
  applications.value = await db.applications.toArray();
});
</script>

<template>
  <button
    @click="openDashboard"
    class="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
  >
    Open Full Dashboard
  </button>
  <button
    @click="addManualApplication"
    class="w-full mt-2 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded transition-colors"
  >
    + Add Application Manually
  </button>
  <div class="w-80 p-4 bg-gray-50 text-gray-800">
    <h1 class="text-lg font-bold mb-4 text-blue-600">JobTrack</h1>

    <div
      v-if="applications.length === 0"
      class="text-sm text-gray-500 text-center py-4"
    >
      No applications tracked yet. Go apply for a job!
    </div>

    <ul class="space-y-2">
      <li
        v-for="job in applications"
        :key="job.id"
        class="p-3 bg-white rounded shadow-sm border border-gray-100"
      >
        <div class="font-semibold text-sm">{{ job.jobTitle }}</div>
        <div class="text-xs text-gray-600 mt-1">
          {{ job.company }} &bull;
          <span class="text-green-600 font-medium">{{ job.status }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
