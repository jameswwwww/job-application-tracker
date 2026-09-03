<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

import {
  getApplicationsForCurrentOwner,
  syncCurrentUserApplications,
} from "../../src/services/syncService";

import type { JobApplication } from "../../src/types";

import { getSessionUserId } from "../../src/services/authService";

const isSignedIn = ref(false);

const applications = ref<JobApplication[]>([]);

async function loadApplications() {
  applications.value = await getApplicationsForCurrentOwner();
}

const openDashboard = () => {
  browser.tabs.create({
    url: browser.runtime.getURL("/dashboard.html"),
  });
};

const addManualApplication = () => {
  browser.tabs.create({
    url: browser.runtime.getURL("/dashboard.html") + "?action=add",
  });
};

const recentApplications = computed(() => {
  return [...applications.value]
    .sort(
      (a, b) =>
        new Date(b.applicationDate).getTime() -
        new Date(a.applicationDate).getTime(),
    )
    .slice(0, 3);
});

const interviewCount = computed(
  () => applications.value.filter((app) => app.status === "Interview").length,
);

const openLogin = () => {
  browser.tabs.create({
    url: browser.runtime.getURL("/dashboard.html") + "?action=login",
  });
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function statusClass(status: JobApplication["status"]) {
  switch (status) {
    case "Offer":
      return "bg-emerald-50 text-emerald-700";

    case "Interview":
      return "bg-violet-50 text-violet-700";

    case "Rejected":
      return "bg-red-50 text-red-600";

    case "Assessment":
      return "bg-amber-50 text-amber-700";

    case "Applied":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

onMounted(async () => {
  isSignedIn.value = !!(await getSessionUserId());

  await loadApplications();

  try {
    await syncCurrentUserApplications();
    await loadApplications();
  } catch (error) {
    console.warn("JobTrack: Background popup sync failed", error);
  }
});
</script>

<template>
  <div class="w-500px min-w-500px bg-white text-slate-900">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-5 pb-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-900 text-white shadow-sm"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M3 12h18" />
          </svg>
        </div>

        <div>
          <h1 class="text-[15px] font-semibold leading-tight">JobGuard MY</h1>

          <p class="mt-0.5 text-xs text-gray-400">Safer job search tracker</p>
        </div>
      </div>

      <button
        type="button"
        class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        title="Open dashboard"
        @click="openDashboard"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M14 3h7v7" />
          <path d="M10 14 21 3" />
          <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
        </svg>
      </button>
    </div>

    <!-- Summary -->
    <div class="mx-5 grid grid-cols-2 gap-3">
      <div
        class="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5"
      >
        <div class="text-xs text-gray-500">Applications</div>

        <div class="mt-1 text-xl font-semibold tracking-tight">
          {{ applications.length }}
        </div>
      </div>

      <div
        class="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5"
      >
        <div class="text-xs text-gray-500">Interviews</div>

        <div class="mt-1 text-xl font-semibold tracking-tight">
          {{ interviewCount }}
        </div>
      </div>
    </div>

    <!-- Recent -->
    <div class="px-5 pt-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Recent
        </h2>

        <button
          v-if="applications.length > 0"
          type="button"
          class="text-xs font-medium text-blue-600 hover:text-blue-700"
          @click="openDashboard"
        >
          View all
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="recentApplications.length === 0"
        class="rounded-xl border border-dashed border-gray-200 px-5 py-7 text-center"
      >
        <div
          class="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 5v14" />

            <path d="M5 12h14" />
          </svg>
        </div>

        <p class="mt-3 text-sm font-medium text-gray-700">
          No applications yet
        </p>

        <p class="mt-1 text-xs leading-5 text-gray-400">
          Applications you track will show up here.
        </p>
      </div>

      <!-- Recent List -->
      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="job in recentApplications"
          :key="job.id"
          class="flex items-start justify-between gap-3 py-3"
        >
          <div class="min-w-0">
            <div class="truncate text-sm font-medium text-gray-800">
              {{ job.jobTitle }}
            </div>

            <div class="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span class="max-w-135px truncate">
                {{ job.company }}
              </span>

              <span> · </span>

              <span>
                {{ formatDate(job.applicationDate) }}
              </span>
            </div>
          </div>

          <span
            :class="[
              'shrink-0 rounded-full px-2 py-1 text-[10px] font-medium',
              statusClass(job.status),
            ]"
          >
            {{ job.status }}
          </span>
        </div>
      </div>
      <button
        v-if="!isSignedIn"
        type="button"
        class="w-full rounded-xl px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
        @click="openLogin"
      >
        Sign in to sync
      </button>

      <div v-else class="py-2 text-center text-xs font-medium text-emerald-600">
        ● Cloud sync enabled
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="mt-4 border-t border-gray-100 p-4">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
        @click="addManualApplication"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>

        Add application
      </button>

      <button
        type="button"
        class="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        @click="openDashboard"
      >
        Open dashboard
      </button>
    </div>
  </div>
</template>
