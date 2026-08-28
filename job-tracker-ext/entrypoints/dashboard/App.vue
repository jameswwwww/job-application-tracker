<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

import { db } from "../../src/services/db";

import {
  createManualApplication,
  updateApplication,
} from "../../src/services/storageService";

import type {
  JobApplication,
  ApplicationFormValues,
  ApplicationStatus,
  JobPlatform,
} from "../../src/types";

import ApplicationForm from "../../components/ApplicationForm.vue";

const applications = ref<JobApplication[]>([]);

const showForm = ref(false);

const editingApplication = ref<JobApplication | null>(null);

const formError = ref("");

// -----------------------------
// Search & Filters
// -----------------------------

const searchQuery = ref("");

const selectedStatus = ref<"All" | ApplicationStatus>("All");

const selectedPlatform = ref<"All" | JobPlatform>("All");

const statusOptions: Array<"All" | ApplicationStatus> = [
  "All",
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

const platformOptions: Array<"All" | JobPlatform> = [
  "All",
  "LinkedIn",
  "JobStreet",
  "Indeed",
  "Greenhouse",
  "CompanySite",
  "Other",
];

// -----------------------------
// Load Applications
// -----------------------------

async function loadApplications() {
  applications.value = await db.applications
    .orderBy("applicationDate")
    .reverse()
    .toArray();
}

// -----------------------------
// Dashboard Statistics
// -----------------------------

const totalApplications = computed(() => applications.value.length);

const appliedCount = computed(
  () => applications.value.filter((app) => app.status === "Applied").length,
);

const interviewCount = computed(
  () => applications.value.filter((app) => app.status === "Interview").length,
);

const offerCount = computed(
  () => applications.value.filter((app) => app.status === "Offer").length,
);

const rejectedCount = computed(
  () => applications.value.filter((app) => app.status === "Rejected").length,
);

// -----------------------------
// Filtered Applications
// -----------------------------

const filteredApplications = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return applications.value.filter((application) => {
    const matchesSearch =
      !query ||
      application.jobTitle.toLowerCase().includes(query) ||
      application.company.toLowerCase().includes(query) ||
      (application.location || "").toLowerCase().includes(query);

    const matchesStatus =
      selectedStatus.value === "All" ||
      application.status === selectedStatus.value;

    const matchesPlatform =
      selectedPlatform.value === "All" ||
      application.platform === selectedPlatform.value;

    return matchesSearch && matchesStatus && matchesPlatform;
  });
});

// -----------------------------
// Add / Edit Form
// -----------------------------

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

// -----------------------------
// Status Update
// -----------------------------

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

// -----------------------------
// Delete
// -----------------------------

async function deleteApp(id: string) {
  if (!confirm("Remove this application?")) {
    return;
  }

  await db.applications.delete(id);

  await loadApplications();
}

// -----------------------------
// Filters
// -----------------------------

function clearFilters() {
  searchQuery.value = "";

  selectedStatus.value = "All";

  selectedPlatform.value = "All";
}

// -----------------------------
// Confidence Helpers
// -----------------------------

function percentage(value: number | undefined) {
  return Math.round((value ?? 0) * 100);
}

function confidenceClass(value: number | undefined) {
  const confidence = value ?? 0;

  if (confidence >= 0.8) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (confidence >= 0.5) {
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }

  return "bg-red-50 text-red-700 border-red-200";
}

// -----------------------------
// Initialisation
// -----------------------------

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
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Application Dashboard</h1>

        <p class="text-sm text-gray-500 mt-1">
          Track and manage your job applications.
        </p>
      </div>

      <button
        class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
        @click="openAddForm"
      >
        + Add Application
      </button>
    </div>

    <!-- Statistics -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div class="text-sm font-medium text-gray-500">Total</div>

        <div class="text-3xl font-bold text-gray-900 mt-2">
          {{ totalApplications }}
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div class="text-sm font-medium text-gray-500">Applied</div>

        <div class="text-3xl font-bold text-blue-600 mt-2">
          {{ appliedCount }}
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div class="text-sm font-medium text-gray-500">Interviews</div>

        <div class="text-3xl font-bold text-purple-600 mt-2">
          {{ interviewCount }}
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div class="text-sm font-medium text-gray-500">Offers</div>

        <div class="text-3xl font-bold text-green-600 mt-2">
          {{ offerCount }}
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div class="text-sm font-medium text-gray-500">Rejected</div>

        <div class="text-3xl font-bold text-red-500 mt-2">
          {{ rejectedCount }}
        </div>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_200px_200px_auto] gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search company, role or location..."
          class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          v-model="selectedStatus"
          class="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ status === "All" ? "All statuses" : status }}
          </option>
        </select>

        <select
          v-model="selectedPlatform"
          class="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option
            v-for="platform in platformOptions"
            :key="platform"
            :value="platform"
          >
            {{ platform === "All" ? "All platforms" : platform }}
          </option>
        </select>

        <button
          type="button"
          class="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>

      <div class="text-xs text-gray-500 mt-3">
        Showing
        {{ filteredApplications.length }}
        of
        {{ applications.length }}
        applications
      </div>
    </div>

    <!-- Applications -->
    <div
      class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr
              class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500"
            >
              <th class="p-4 font-semibold">Company</th>

              <th class="p-4 font-semibold">Role</th>

              <th class="p-4 font-semibold">Location</th>

              <th class="p-4 font-semibold">Platform</th>

              <th class="p-4 font-semibold">Date</th>

              <th class="p-4 font-semibold">Confidence</th>

              <th class="p-4 font-semibold">Status</th>

              <th class="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="job in filteredApplications"
              :key="job.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <!-- Company -->
              <td class="p-4">
                <div class="font-semibold text-gray-900">
                  {{ job.company }}
                </div>

                <div class="text-xs text-gray-400 mt-1 capitalize">
                  {{ job.source }}
                </div>
              </td>

              <!-- Role -->
              <td class="p-4">
                <a
                  v-if="job.jobUrl"
                  :href="job.jobUrl"
                  target="_blank"
                  class="text-blue-600 hover:underline font-medium"
                >
                  {{ job.jobTitle }}
                </a>

                <span v-else class="font-medium text-gray-800">
                  {{ job.jobTitle }}
                </span>

                <div v-if="job.salary" class="text-xs text-gray-500 mt-1">
                  {{ job.salary }}
                </div>

                <div v-if="job.jobType" class="text-xs text-gray-400 mt-1">
                  {{ job.jobType }}
                </div>
              </td>

              <!-- Location -->
              <td class="p-4 text-sm text-gray-600">
                {{ job.location || "—" }}
              </td>

              <!-- Platform -->
              <td class="p-4">
                <div class="text-sm text-gray-700">
                  {{ job.platform }}
                </div>

                <div class="text-xs text-gray-400 mt-1">
                  {{ job.extractionMethod }}
                </div>
              </td>

              <!-- Date -->
              <td class="p-4 text-sm text-gray-500">
                {{ new Date(job.applicationDate).toLocaleDateString() }}
              </td>

              <!-- Confidence -->
              <td class="p-4">
                <div
                  v-if="job.source === 'manual'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium bg-gray-50 text-gray-600 border-gray-200"
                >
                  Manual
                </div>

                <div v-else class="space-y-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 w-12"> Data </span>

                    <span
                      :class="[
                        'inline-flex px-2 py-0.5 rounded-full border text-xs font-medium',
                        confidenceClass(job.extractionConfidence),
                      ]"
                    >
                      {{ percentage(job.extractionConfidence) }}%
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 w-12"> Apply </span>

                    <span
                      :class="[
                        'inline-flex px-2 py-0.5 rounded-full border text-xs font-medium',
                        confidenceClass(job.applicationConfidence),
                      ]"
                    >
                      {{ percentage(job.applicationConfidence) }}%
                    </span>
                  </div>

                  <div v-if="job.userConfirmed" class="text-xs text-green-600">
                    User confirmed
                  </div>
                </div>
              </td>

              <!-- Status -->
              <td class="p-4">
                <select
                  :value="job.status"
                  class="text-sm border border-gray-300 rounded-lg bg-white px-2 py-1.5"
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

              <!-- Actions -->
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
      </div>

      <!-- No applications at all -->
      <div v-if="applications.length === 0" class="p-12 text-center">
        <div class="text-lg font-medium text-gray-700">No applications yet</div>

        <div class="text-sm text-gray-500 mt-1 mb-5">
          Applications detected by the extension will appear here.
        </div>

        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          @click="openAddForm"
        >
          Add your first application
        </button>
      </div>

      <!-- Filters returned nothing -->
      <div
        v-else-if="filteredApplications.length === 0"
        class="p-12 text-center"
      >
        <div class="text-lg font-medium text-gray-700">
          No matching applications
        </div>

        <div class="text-sm text-gray-500 mt-1 mb-4">
          Try changing your search or filters.
        </div>

        <button
          class="text-blue-600 hover:underline text-sm font-medium"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>
    </div>

    <!-- Application Form -->
    <ApplicationForm
      v-if="showForm"
      :application="editingApplication"
      :error="formError"
      @save="saveForm"
      @cancel="closeForm"
    />
  </div>
</template>
