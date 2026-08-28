<script setup lang="ts">
import { ref, onMounted } from "vue";
import { db } from "../../src/services/db";
import type { JobApplication } from "../../src/types";

const applications = ref<JobApplication[]>([]);

onMounted(async () => {
  // Fetch jobs, sorting by newest first
  applications.value = await db.applications
    .orderBy("applicationDate")
    .reverse()
    .toArray();
});

const updateStatus = async (id: string, event: Event) => {
  const select = event.target as HTMLSelectElement;
  const newStatus = select.value as JobApplication["status"];

  await db.applications.update(id, { status: newStatus });
  // Refresh UI
  applications.value = await db.applications
    .orderBy("applicationDate")
    .reverse()
    .toArray();
};

const deleteApp = async (id: string) => {
  if (confirm("Remove this application?")) {
    await db.applications.delete(id);
    applications.value = applications.value.filter((app) => app.id !== id);
  }
};
</script>

<template>
  <div class="max-w-6xl mx-auto p-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Application Pipeline</h1>
      <div
        class="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200"
      >
        Total: {{ applications.length }}
      </div>
    </div>

    <div
      class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
    >
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
            <th class="p-4 font-semibold">Company</th>
            <th class="p-4 font-semibold">Role</th>
            <th class="p-4 font-semibold">Source</th>
            <th class="p-4 font-semibold">Date</th>
            <th class="p-4 font-semibold">Status</th>
            <th class="p-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="job in applications"
            :key="job.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="p-4 font-medium text-gray-900">{{ job.company }}</td>
            <td class="p-4 text-gray-700">
              <a
                :href="job.jobUrl"
                target="_blank"
                class="text-blue-600 hover:underline"
                >{{ job.jobTitle }}</a
              >
            </td>
            <td class="p-4 text-gray-500 text-sm">{{ job.platform }}</td>
            <td class="p-4 text-gray-500 text-sm">
              {{ new Date(job.applicationDate).toLocaleDateString() }}
            </td>
            <td class="p-4">
              <select
                :value="job.status"
                @change="updateStatus(job.id, $event)"
                class="text-sm border-gray-300 rounded bg-gray-50 px-2 py-1 cursor-pointer focus:ring-blue-500"
              >
                <option value="Saved">Saved</option>
                <option value="Applied">Applied</option>
                <option value="Assessment">Assessment</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </td>
            <td class="p-4 text-right">
              <button
                @click="deleteApp(job.id)"
                class="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="applications.length === 0"
        class="p-8 text-center text-gray-500"
      >
        Your pipeline is empty. Go apply for some jobs!
      </div>
    </div>
  </div>
</template>
