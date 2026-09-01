<script setup lang="ts">
import { reactive, ref, watch, computed } from "vue";

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
  "Lever",
  "Workday",
  "Ashby",
  "SmartRecruiters",
  "BambooHR",
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

    tags: [],
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

      tags: [...(application.tags ?? [])],
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

const tagInput = ref("");

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag);
  }
  tagInput.value = "";
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag);
}

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

    tags: [...form.tags],
  });
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
    @click.self="emit('cancel')"
  >
    <div
      role="dialog"
      aria-modal="true"
      class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
    >
      <!-- Header -->
      <div
        class="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5"
      >
        <div>
          <h2
            class="m-0 text-lg font-semibold tracking-[-0.015em] text-slate-900"
          >
            {{ title }}
          </h2>

          <p class="mb-0 mt-1 text-sm text-slate-500">
            {{
              application
                ? "Update the details for this application."
                : "Add an opportunity to your application tracker."
            }}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close"
          class="flex h-9 w-9 items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          @click="emit('cancel')"
        >
          <svg
            width="17"
            height="17"
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

      <!-- Form -->
      <form class="min-h-0 flex-1 overflow-y-auto" @submit.prevent="submit">
        <div class="space-y-7 px-6 py-6">
          <!-- Error -->
          <div
            v-if="error"
            class="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <svg
              class="mt-0.5 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>

            {{ error }}
          </div>

          <!-- Role details -->
          <section>
            <div class="mb-4">
              <h3 class="m-0 text-sm font-semibold text-slate-800">
                Role details
              </h3>

              <p class="mb-0 mt-1 text-xs text-slate-400">
                Basic information about the position.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  for="jobTitle"
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Job title
                  <span class="text-red-400">*</span>
                </label>

                <input
                  id="jobTitle"
                  v-model="form.jobTitle"
                  required
                  type="text"
                  placeholder="e.g. Software Engineer"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  for="company"
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Company
                  <span class="text-red-400">*</span>
                </label>

                <input
                  id="company"
                  v-model="form.company"
                  required
                  type="text"
                  placeholder="e.g. Grab"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Location
                </label>

                <input
                  v-model="form.location"
                  type="text"
                  placeholder="e.g. Kuala Lumpur"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Salary
                </label>

                <input
                  v-model="form.salary"
                  type="text"
                  placeholder="e.g. RM 5,000 – RM 7,000"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Job type
                </label>

                <input
                  v-model="form.jobType"
                  type="text"
                  placeholder="e.g. Full-time"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Platform
                </label>

                <select
                  v-model="form.platform"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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

            <div class="mt-4">
              <label
                class="mb-1.5 block text-[13px] font-medium text-slate-700"
              >
                Job URL
              </label>

              <input
                v-model="form.jobUrl"
                type="url"
                placeholder="https://..."
                class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </section>

          <div class="h-px bg-slate-100" />

          <!-- Application -->
          <section>
            <div class="mb-4">
              <h3 class="m-0 text-sm font-semibold text-slate-800">
                Application
              </h3>

              <p class="mb-0 mt-1 text-xs text-slate-400">
                Track when you applied and where you are in the process.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Application date
                </label>

                <input
                  v-model="form.applicationDate"
                  type="date"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  class="mb-1.5 block text-[13px] font-medium text-slate-700"
                >
                  Status
                </label>

                <select
                  v-model="form.status"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option
                    v-for="status in statuses"
                    :key="status"
                    :value="status"
                  >
                    {{ status }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mt-4">
              <label
                class="mb-1.5 block text-[13px] font-medium text-slate-700"
              >
                Tags
              </label>

              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="tag in form.tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {{ tag }}

                  <button
                    type="button"
                    class="ml-0.5 rounded p-0.5 text-slate-400 transition hover:text-slate-600"
                    @click="removeTag(tag)"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </span>
              </div>

              <div class="mt-2 flex gap-2">
                <input
                  v-model="tagInput"
                  type="text"
                  placeholder="e.g. Remote, Priority, Referral"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  @keydown.enter.prevent="addTag"
                />

                <button
                  type="button"
                  class="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                  @click="addTag"
                >
                  Add
                </button>
              </div>
            </div>

            <div class="mt-4">
              <label
                class="mb-1.5 block text-[13px] font-medium text-slate-700"
              >
                Notes
              </label>

              <textarea
                v-model="form.notes"
                rows="4"
                placeholder="Add interview notes, recruiter details, reminders..."
                class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </section>
        </div>

        <!-- Sticky Footer -->
        <div
          class="sticky bottom-0 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur"
        >
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            @click="emit('cancel')"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="rounded-xl border-0 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
