<script setup lang="ts">
import { reactive, watch, computed } from "vue";

import type {
  JobApplication,
  ApplicationFormValues,
  JobPlatform,
  ApplicationStatus,
} from "../src/types";

const props = defineProps<{
  application?: JobApplication | null;
  error?: string;
}>();

const emit = defineEmits<{
  save: [values: ApplicationFormValues];
  cancel: [];
}>();

const platforms: JobPlatform[] = [
  "LinkedIn",
  "JobStreet",
  "Indeed",
  "Greenhouse",
  "CompanySite",
  "Other",
];

const statuses: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): ApplicationFormValues {
  return {
    company: "",
    jobTitle: "",

    location: null,
    salary: null,
    jobType: null,

    platform: "Other",

    jobUrl: "",

    applicationDate: today(),

    status: "Saved",

    notes: "",
  };
}

const form = reactive<ApplicationFormValues>(createEmptyForm());

watch(
  () => props.application,
  (application) => {
    if (!application) {
      Object.assign(form, createEmptyForm());

      return;
    }

    Object.assign(form, {
      company: application.company,

      jobTitle: application.jobTitle,

      location: application.location,

      salary: application.salary,

      jobType: application.jobType,

      platform: application.platform,

      jobUrl: application.jobUrl,

      applicationDate: application.applicationDate.slice(0, 10),

      status: application.status,

      notes: application.notes || "",
    });
  },
  {
    immediate: true,
  },
);

const title = computed(() =>
  props.application ? "Edit Application" : "Add Application",
);

const submitLabel = computed(() =>
  props.application ? "Save Changes" : "Add Application",
);

function cleanNullable(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value.trim();

  return cleaned || null;
}

function submit() {
  if (!form.company.trim() || !form.jobTitle.trim()) {
    return;
  }

  emit("save", {
    company: form.company.trim(),

    jobTitle: form.jobTitle.trim(),

    location: cleanNullable(form.location),

    salary: cleanNullable(form.salary),

    jobType: cleanNullable(form.jobType),

    platform: form.platform,

    jobUrl: form.jobUrl.trim(),

    applicationDate: form.applicationDate,

    status: form.status,

    notes: form.notes?.trim() || "",
  });
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div
        class="flex justify-between items-center px-6 py-4 border-b border-gray-200"
      >
        <h2 class="text-xl font-bold text-gray-900">
          {{ title }}
        </h2>

        <button
          type="button"
          class="text-gray-400 hover:text-gray-700 text-2xl"
          @click="emit('cancel')"
        >
          ×
        </button>
      </div>

      <form class="p-6 space-y-5" @submit.prevent="submit">
        <div
          v-if="error"
          class="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200"
        >
          {{ error }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Job Title *
            </label>

            <input
              v-model="form.jobTitle"
              required
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Company *
            </label>

            <input
              v-model="form.company"
              required
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Grab"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>

            <input
              v-model="form.location"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Kuala Lumpur"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Salary
            </label>

            <input
              v-model="form.salary"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="RM 5,000 – RM 7,000"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Job Type
            </label>

            <input
              v-model="form.jobType"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Full-time"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>

            <select
              v-model="form.platform"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option
                v-for="platform in platforms"
                :key="platform"
                :value="platform"
              >
                {{ platform }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Job URL
          </label>

          <input
            v-model="form.jobUrl"
            type="url"
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="https://..."
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Application Date
            </label>

            <input
              v-model="form.applicationDate"
              type="date"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>

            <select
              v-model="form.status"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option v-for="status in statuses" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>

          <textarea
            v-model="form.notes"
            rows="4"
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Recruiter contacted me, interview notes, etc."
          />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            @click="emit('cancel')"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
