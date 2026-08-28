<script setup lang="ts">
import { ref, onMounted } from "vue";

import { db } from "../../src/services/db";

import {
  createManualApplication,
  updateApplication,
} from "../../src/services/storageService";

import type { JobApplication, ApplicationFormValues } from "../../src/types";

import ApplicationForm from "../../components/ApplicationForm.vue";

const applications = ref<JobApplication[]>([]);

const showForm = ref(false);

const editingApplication = ref<JobApplication | null>(null);

const formError = ref("");

async function loadApplications() {
  applications.value = await db.applications
    .orderBy("applicationDate")
    .reverse()
    .toArray();
}

function openAddForm() {
  editingApplication.value = null;

  formError.value = "";

  showForm.value = true;
}

function openEditForm(application: JobApplication) {
  editingApplication.value = application;

  formError.value = "";

  showForm.value = true;
}

function closeForm() {
  showForm.value = false;

  editingApplication.value = null;

  formError.value = "";
}

async function saveForm(values: ApplicationFormValues) {
  try {
    formError.value = "";

    if (editingApplication.value) {
      await updateApplication(editingApplication.value.id, values);
    } else {
      await createManualApplication(values);
    }

    closeForm();

    await loadApplications();
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : "Unable to save application.";
  }
}

async function updateStatus(application: JobApplication, event: Event) {
  const select = event.target as HTMLSelectElement;

  const newStatus = select.value as JobApplication["status"];

  const updates: Partial<JobApplication> = {
    status: newStatus,

    updatedAt: new Date().toISOString(),
  };

  if (newStatus !== "Saved") {
    updates.applicationConfidence = 1;

    updates.userConfirmed = true;
  }

  await db.applications.update(application.id, updates);

  await loadApplications();
}

async function deleteApp(id: string) {
  if (!confirm("Remove this application?")) {
    return;
  }

  await db.applications.delete(id);

  await loadApplications();
}

onMounted(async () => {
  await loadApplications();

  const params = new URLSearchParams(window.location.search);

  if (params.get("action") === "add") {
    openAddForm();
  }
});
</script>

<template>
  <div class="max-w-7xl mx-auto p-8">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Application Pipeline</h1>

        <p class="text-sm text-gray-500 mt-1">
          Track and manage your job applications.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-200"
        >
          Total:
          {{ applications.length }}
        </div>

        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
          @click="openAddForm"
        >
          + Add Application
        </button>
      </div>
    </div>

    <div
      class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
            <th class="p-4 font-semibold">Company</th>

            <th class="p-4 font-semibold">Role</th>

            <th class="p-4 font-semibold">Location</th>

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
            class="hover:bg-gray-50"
          >
            <td class="p-4 font-medium text-gray-900">
              {{ job.company }}
            </td>

            <td class="p-4">
              <a
                v-if="job.jobUrl"
                :href="job.jobUrl"
                target="_blank"
                class="text-blue-600 hover:underline"
              >
                {{ job.jobTitle }}
              </a>

              <span v-else>
                {{ job.jobTitle }}
              </span>

              <div v-if="job.salary" class="text-xs text-gray-500 mt-1">
                {{ job.salary }}
              </div>
            </td>

            <td class="p-4 text-sm text-gray-600">
              {{ job.location || "—" }}
            </td>

            <td class="p-4 text-sm text-gray-500">
              <div>
                {{ job.platform }}
              </div>

              <div class="text-xs text-gray-400 mt-1">
                {{ job.source }}
              </div>
            </td>

            <td class="p-4 text-sm text-gray-500">
              {{ new Date(job.applicationDate).toLocaleDateString() }}
            </td>

            <td class="p-4">
              <select
                :value="job.status"
                class="text-sm border border-gray-300 rounded-lg bg-white px-2 py-1"
                @change="updateStatus(job, $event)"
              >
                <option value="Saved">Saved</option>

                <option value="Applied">Applied</option>

                <option value="Assessment">Assessment</option>

                <option value="Interview">Interview</option>

                <option value="Offer">Offer</option>

                <option value="Rejected">Rejected</option>

                <option value="Withdrawn">Withdrawn</option>
              </select>
            </td>

            <td class="p-4 text-right">
              <div class="flex justify-end gap-3">
                <button
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  @click="openEditForm(job)"
                >
                  Edit
                </button>

                <button
                  class="text-red-500 hover:text-red-700 text-sm font-medium"
                  @click="deleteApp(job.id)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="applications.length === 0" class="p-12 text-center">
        <div class="text-gray-500 mb-4">No applications tracked yet.</div>

        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          @click="openAddForm"
        >
          Add your first application
        </button>
      </div>
    </div>

    <ApplicationForm
      v-if="showForm"
      :application="editingApplication"
      :error="formError"
      @save="saveForm"
      @cancel="closeForm"
    />
  </div>
</template>
