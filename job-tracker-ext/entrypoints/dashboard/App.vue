<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

import { getSyncStatus } from "../../src/services/syncStatusService";

import {
  createManualApplication,
  updateApplication,
  deleteApplication,
  updateApplicationStatus,
} from "../../src/services/storageService";

import type {
  JobApplication,
  ApplicationFormValues,
  ApplicationStatus,
  JobPlatform,
  ApplicationStatusEvent,
} from "../../src/types";

import { getStatusHistory } from "../../src/services/statusHistoryService";

import type { User } from "@supabase/supabase-js";

import { getCurrentUser, signOut } from "../../src/services/authService";

import {
  getApplicationsForCurrentOwner,
  syncCurrentUserApplications,
} from "../../src/services/syncService";

import { buildApplicationAnalytics } from "../../src/utils/analytics";

import ApplicationForm from "../../components/ApplicationForm.vue";
import AuthModal from "../../components/AuthModal.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ToastNotification from "../../components/ToastNotification.vue";

const applications = ref<JobApplication[]>([]);

const toasts = ref<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);
let toastId = 0;

function showToast(message: string, type: "success" | "error" | "info" = "success") {
  const id = ++toastId;
  toasts.value.push({ id, message, type });
}

function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

const showForm = ref(false);

const editingApplication = ref<JobApplication | null>(null);

const formError = ref("");

const isOnline = ref(navigator.onLine);

const isSyncing = ref(false);

const pendingSyncCount = ref(0);

const lastSyncAt = ref<string | null>(null);

const syncError = ref<string | null>(null);

const pendingDelete = ref<JobApplication | null>(null);

const historyApplication = ref<JobApplication | null>(null);

const statusHistory = ref<ApplicationStatusEvent[]>([]);

const isHistoryLoading = ref(false);

// -----------------------------
// Search & Filters
// -----------------------------

const searchQuery = ref("");

const selectedStatus = ref<"All" | ApplicationStatus>("All");

const selectedPlatform = ref<"All" | JobPlatform>("All");

const selectedTag = ref<"All" | string>("All");

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
  "Lever",
  "Workday",
  "Ashby",
  "SmartRecruiters",
  "BambooHR",
  "CompanySite",
  "Other",
];

const currentUser = ref<User | null>(null);

const showAuthModal = ref(false);

function consumeLoginAction() {
  const url = new URL(window.location.href);

  if (url.searchParams.get("action") !== "login") {
    return false;
  }

  url.searchParams.delete("action");

  window.history.replaceState(window.history.state, "", url);

  return true;
}

// -----------------------------
// Load Applications
// -----------------------------

async function loadApplications() {
  applications.value = await getApplicationsForCurrentOwner();
}

async function loadUser() {
  currentUser.value = await getCurrentUser();
}

async function handleSignOut() {
  await signOut();

  currentUser.value = null;

  await loadApplications();
}

async function handleAuthenticated() {
  await loadUser();

  await syncCurrentUserApplications();

  await loadApplications();
}

async function openHistory(application: JobApplication) {
  historyApplication.value = application;

  isHistoryLoading.value = true;

  try {
    statusHistory.value = await getStatusHistory(application.id);
  } finally {
    isHistoryLoading.value = false;
  }
}

function closeHistory() {
  historyApplication.value = null;

  statusHistory.value = [];
}

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// -----------------------------
// Dashboard Statistics
// -----------------------------

const analytics = computed(() => buildApplicationAnalytics(applications.value));

const monthlyMaximum = computed(() =>
  Math.max(1, ...analytics.value.monthlyTrend.map((month) => month.count)),
);

const topPlatforms = computed(() =>
  analytics.value.platformBreakdown.slice(0, 5),
);

function monthlyBarWidth(count: number) {
  return `${Math.round((count / monthlyMaximum.value) * 100)}%`;
}

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

    const matchesTag =
      selectedTag.value === "All" ||
      (application.tags ?? []).includes(selectedTag.value);

    return matchesSearch && matchesStatus && matchesPlatform && matchesTag;
  });
});

const activeCount = computed(
  () =>
    applications.value.filter(
      (app) => app.status !== "Rejected" && app.status !== "Withdrawn",
    ).length,
);

function statusClass(status: JobApplication["status"]) {
  switch (status) {
    case "Offer":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Interview":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "Assessment":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Rejected":
      return "bg-red-50 text-red-600 border-red-200";

    case "Applied":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Withdrawn":
      return "bg-gray-100 text-gray-500 border-gray-200";

    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

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

    await refreshSyncStatus();

    showToast(editingApplication.value ? "Application updated" : "Application added");
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

  await updateApplicationStatus(application.id, newStatus);

  await loadApplications();

  await refreshSyncStatus();
}

// -----------------------------
// Delete
// -----------------------------

function requestDelete(application: JobApplication) {
  pendingDelete.value = application;
}

async function confirmDelete() {
  if (!pendingDelete.value) {
    return;
  }

  const id = pendingDelete.value.id;

  pendingDelete.value = null;

  await deleteApplication(id);

  await loadApplications();

  await refreshSyncStatus();
}

// -----------------------------
// Filters
// -----------------------------

function clearFilters() {
  searchQuery.value = "";

  selectedStatus.value = "All";

  selectedPlatform.value = "All";

  selectedTag.value = "All";
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

async function refreshSyncStatus() {
  const status = await getSyncStatus();

  pendingSyncCount.value = status.pendingCount;

  lastSyncAt.value = status.lastSyncAt;

  syncError.value = status.lastError;
}

async function syncNow() {
  if (!currentUser.value || !navigator.onLine) {
    return;
  }

  isSyncing.value = true;

  syncError.value = null;

  try {
    const response = await browser.runtime.sendMessage({
      type: "SYNC_NOW",
    });

    if (response?.status !== "Success") {
      throw new Error(response?.message || "Sync failed.");
    }

    await loadApplications();

    await refreshSyncStatus();
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : "Sync failed.";
  } finally {
    isSyncing.value = false;
  }
}

async function handleOnline() {
  isOnline.value = true;

  if (currentUser.value) {
    await syncNow();
  }
}

function handleOffline() {
  isOnline.value = false;
}

// -----------------------------
// CSV Export
// -----------------------------

function exportCsv() {
  const headers = [
    "Company",
    "Job Title",
    "Location",
    "Salary",
    "Job Type",
    "Platform",
    "Status",
    "Applied Date",
    "Source",
    "URL",
    "Tags",
    "Notes",
  ];

  const rows = filteredApplications.value.map((app) => [
    app.company,
    app.jobTitle,
    app.location ?? "",
    app.salary ?? "",
    app.jobType ?? "",
    app.platform,
    app.status,
    new Date(app.applicationDate).toISOString().slice(0, 10),
    app.source,
    app.jobUrl,
    (app.tags ?? []).join("; "),
    (app.notes ?? "").replace(/\n/g, " "),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '\"')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobtrack-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`Exported ${filteredApplications.value.length} applications to CSV`);
}

// -----------------------------
// Tags (derived)
// -----------------------------

const allTags = computed(() => {
  const tagSet = new Set<string>();
  for (const app of applications.value) {
    for (const tag of app.tags ?? []) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort();
});

// -----------------------------
// Initialisation
// -----------------------------

onMounted(async () => {
  await loadUser();

  if (currentUser.value) {
    await syncCurrentUserApplications();
  }

  await loadApplications();

  const params = new URLSearchParams(window.location.search);

  if (params.get("action") === "add") {
    openAddForm();
  }

  if (consumeLoginAction()) {
    showAuthModal.value = !currentUser.value;
  }

  window.addEventListener("online", handleOnline);

  window.addEventListener("offline", handleOffline);

  await refreshSyncStatus();
});

onUnmounted(() => {
  window.removeEventListener("online", handleOnline);

  window.removeEventListener("offline", handleOffline);
});
</script>

<template>
  <div class="min-h-screen bg-[#f8fafc]">
    <div class="mx-auto max-w-1320px px-6 py-8 lg:px-10">
      <!-- Header -->
      <header
        class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"
            >
              <svg
                width="19"
                height="19"
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
              <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Applications
              </h1>

              <p class="mt-0.5 text-sm text-gray-500">
                Keep track of every opportunity in one place.
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Signed out -->
          <button
            v-if="!currentUser"
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            @click="showAuthModal = true"
          >
            Sign in
          </button>

          <!-- Signed in -->
          <div v-else class="flex items-center gap-2">
            <div class="hidden text-right sm:block">
              <div class="text-xs text-slate-400">Signed in as</div>

              <div
                class="max-w-180px truncate text-sm font-medium text-slate-700"
              >
                {{ currentUser.email }}
              </div>
            </div>

            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              @click="handleSignOut"
            >
              Sign out
            </button>
          </div>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            @click="openAddForm"
          >
            + Add application
          </button>
        </div>
      </header>

      <button
        v-if="currentUser"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
        :disabled="isSyncing"
        @click="syncNow"
      >
        <!-- Offline -->
        <span v-if="!isOnline" class="h-2 w-2 rounded-full bg-amber-500" />

        <!-- Syncing -->
        <svg
          v-else-if="isSyncing"
          class="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        </svg>

        <span v-else-if="syncError" class="h-2 w-2 rounded-full bg-red-500" />

        <!-- Pending -->
        <span
          v-else-if="pendingSyncCount > 0"
          class="h-2 w-2 rounded-full bg-amber-500"
        />

        <!-- Synced -->
        <span v-else class="h-2 w-2 rounded-full bg-emerald-500" />

        <span v-if="!isOnline"> Offline </span>

        <span v-else-if="isSyncing"> Syncing… </span>

        <span v-else-if="syncError" :title="syncError"> Sync error </span>

        <span v-else-if="pendingSyncCount > 0">
          {{ pendingSyncCount }}
          pending
        </span>

        <span v-else> Synced </span>
      </button>

      <!-- Stats -->
      <section class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
        >
          <p class="text-sm text-gray-500">Total</p>

          <div class="mt-3 flex items-end justify-between">
            <p class="text-3xl font-semibold tracking-tight text-gray-900">
              {{ totalApplications }}
            </p>

            <span class="text-xs text-gray-400"> applications </span>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <p class="text-sm text-gray-500">Active</p>

          <p class="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
            {{ activeCount }}
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <p class="text-sm text-gray-500">Interviews</p>

          <p class="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
            {{ interviewCount }}
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <p class="text-sm text-gray-500">Offers</p>

          <p class="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
            {{ offerCount }}
          </p>
        </div>
      </section>

      <!-- Analytics -->
      <section class="mb-6 grid gap-4 lg:grid-cols-3">
        <!-- Performance -->
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
        >
          <div>
            <h2 class="text-sm font-semibold text-slate-800">Performance</h2>

            <p class="mt-1 text-xs text-slate-400">
              Based on submitted applications
            </p>
          </div>

          <div class="mt-5 divide-y divide-slate-100">
            <div class="flex items-center justify-between py-3">
              <span class="text-sm text-slate-500"> Submitted </span>

              <span class="text-lg font-semibold text-slate-900">
                {{ analytics.submittedCount }}
              </span>
            </div>

            <div class="flex items-center justify-between py-3">
              <div>
                <div class="text-sm text-slate-500">Response rate</div>

                <div class="mt-0.5 text-xs text-slate-400">
                  Assessment, interview, offer or rejection
                </div>
              </div>

              <span class="text-lg font-semibold text-slate-900">
                {{ analytics.responseRate }}%
              </span>
            </div>

            <div class="flex items-center justify-between py-3">
              <div>
                <div class="text-sm text-slate-500">Interview rate</div>

                <div class="mt-0.5 text-xs text-slate-400">
                  Reached interview or offer
                </div>
              </div>

              <span class="text-lg font-semibold text-slate-900">
                {{ analytics.interviewRate }}%
              </span>
            </div>

            <div class="flex items-center justify-between pt-3">
              <span class="text-sm text-slate-500"> Offer rate </span>

              <span class="text-lg font-semibold text-slate-900">
                {{ analytics.offerRate }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Monthly activity -->
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
        >
          <div>
            <h2 class="text-sm font-semibold text-slate-800">
              Application activity
            </h2>

            <p class="mt-1 text-xs text-slate-400">
              Submitted during the last six months
            </p>
          </div>

          <div class="mt-5 space-y-3.5">
            <div v-for="month in analytics.monthlyTrend" :key="month.key">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="text-xs font-medium text-slate-500">
                  {{ month.label }}
                </span>

                <span class="text-xs text-slate-400">
                  {{ month.count }}
                </span>
              </div>

              <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all"
                  :style="{
                    width: monthlyBarWidth(month.count),
                  }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Platform breakdown -->
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
        >
          <div>
            <h2 class="text-sm font-semibold text-slate-800">Platforms</h2>

            <p class="mt-1 text-xs text-slate-400">
              Where your applications come from
            </p>
          </div>

          <div v-if="topPlatforms.length > 0" class="mt-5 space-y-4">
            <div v-for="item in topPlatforms" :key="item.platform">
              <div class="mb-1.5 flex items-center justify-between gap-4">
                <span class="truncate text-sm text-slate-600">
                  {{ item.platform }}
                </span>

                <div class="flex shrink-0 items-center gap-2">
                  <span class="text-xs text-slate-400">
                    {{ item.count }}
                  </span>

                  <span
                    class="w-9 text-right text-xs font-medium text-slate-600"
                  >
                    {{ item.percentage }}%
                  </span>
                </div>
              </div>

              <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full bg-slate-700 transition-all"
                  :style="{
                    width: `${item.percentage}%`,
                  }"
                />
              </div>
            </div>
          </div>

          <div
            v-else
            class="mt-8 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center"
          >
            <p class="text-sm text-slate-400">
              Submit an application to see platform analytics.
            </p>
          </div>
        </div>
      </section>

      <!-- Content -->
      <section
        class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
      >
        <!-- Toolbar -->
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <!-- Search -->
            <div class="relative flex-1">
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search applications"
                class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <!-- Filters -->
            <select
              v-model="selectedStatus"
              class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 outline-none hover:bg-gray-50"
            >
              <option
                v-for="status in statusOptions"
                :key="status"
                :value="status"
              >
                {{ status === "All" ? "All statuses" : status }}
              </option>
            </select>

            <select
              v-model="selectedPlatform"
              class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 outline-none hover:bg-gray-50"
            >
              <option
                v-for="platform in platformOptions"
                :key="platform"
                :value="platform"
              >
                {{ platform === "All" ? "All platforms" : platform }}
              </option>
            </select>

            <select
              v-if="allTags.length > 0"
              v-model="selectedTag"
              class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 outline-none hover:bg-gray-50"
            >
              <option value="All">All tags</option>

              <option v-for="tag in allTags" :key="tag" :value="tag">
                {{ tag }}
              </option>
            </select>

            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              @click="exportCsv"
            >
              Export CSV
            </button>

            <button
              v-if="
                searchQuery ||
                selectedStatus !== 'All' ||
                selectedPlatform !== 'All' ||
                selectedTag !== 'All'
              "
              type="button"
              class="px-2 text-sm font-medium text-gray-400 hover:text-gray-700"
              @click="clearFilters"
            >
              Clear
            </button>
          </div>

          <div class="mt-3 text-xs text-gray-400">
            {{ filteredApplications.length }}
            {{
              filteredApplications.length === 1 ? "application" : "applications"
            }}
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full min-w-1150px text-left">
            <thead>
              <tr class="border-b border-gray-100 text-xs text-gray-400">
                <th class="px-5 py-3 font-medium">Role</th>

                <th class="px-5 py-3 font-medium">Location</th>

                <th class="px-5 py-3 font-medium">Source</th>

                <th class="px-5 py-3 font-medium">Applied</th>

                <th class="px-5 py-3 font-medium">Confidence</th>

                <th class="px-5 py-3 font-medium">Tags</th>

                <th class="px-5 py-3 font-medium">Status</th>

                <th class="px-5 py-3"></th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="job in filteredApplications"
                :key="job.id"
                class="group transition hover:bg-gray-50/70"
              >
                <!-- Role -->
                <td class="px-5 py-4">
                  <div class="max-w-[320px]">
                    <a
                      v-if="job.jobUrl"
                      :href="job.jobUrl"
                      target="_blank"
                      class="block truncate text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {{ job.jobTitle }}
                    </a>

                    <span
                      v-else
                      class="block truncate text-sm font-medium text-gray-900"
                    >
                      {{ job.jobTitle }}
                    </span>

                    <div
                      class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400"
                    >
                      <span>
                        {{ job.company }}
                      </span>

                      <template v-if="job.jobType">
                        <span>·</span>
                        <span>
                          {{ job.jobType }}
                        </span>
                      </template>

                      <template v-if="job.salary">
                        <span>·</span>
                        <span>
                          {{ job.salary }}
                        </span>
                      </template>
                    </div>
                  </div>
                </td>

                <!-- Location -->
                <td class="px-5 py-4 text-sm text-gray-500">
                  {{ job.location || "—" }}
                </td>

                <!-- Source -->
                <td class="px-5 py-4">
                  <div class="text-sm text-gray-600">
                    {{ job.platform }}
                  </div>

                  <div class="mt-0.5 text-xs capitalize text-gray-400">
                    {{ job.source }}
                  </div>
                </td>

                <!-- Date -->
                <td class="whitespace-nowrap px-5 py-4 text-sm text-gray-500">
                  {{
                    new Date(job.applicationDate).toLocaleDateString(
                      undefined,
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )
                  }}
                </td>

                <!-- Confidence -->
                <td class="px-5 py-4">
                  <span
                    v-if="job.source === 'manual'"
                    class="text-xs text-gray-400"
                  >
                    Manual
                  </span>

                  <div v-else class="space-y-1">
                    <div class="flex items-center gap-2 text-xs">
                      <span class="w-9 text-gray-400"> Data </span>

                      <div
                        class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100"
                      >
                        <div
                          class="h-full rounded-full bg-blue-500"
                          :style="{
                            width: percentage(job.extractionConfidence) + '%',
                          }"
                        />
                      </div>

                      <span class="text-gray-500">
                        {{ percentage(job.extractionConfidence) }}%
                      </span>
                    </div>

                    <div class="flex items-center gap-2 text-xs">
                      <span class="w-9 text-gray-400"> Apply </span>

                      <div
                        class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100"
                      >
                        <div
                          class="h-full rounded-full bg-gray-400"
                          :style="{
                            width: percentage(job.applicationConfidence) + '%',
                          }"
                        />
                      </div>

                      <span class="text-gray-500">
                        {{ percentage(job.applicationConfidence) }}%
                      </span>
                    </div>

                    <div
                      v-if="job.userConfirmed"
                      class="text-[11px] text-emerald-600"
                    >
                      Confirmed
                    </div>
                  </div>
                </td>

                <!-- Tags -->
                <td class="px-5 py-4">
                  <div v-if="job.tags?.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in job.tags"
                      :key="tag"
                      class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {{ tag }}
                    </span>
                  </div>

                  <span v-else class="text-xs text-gray-300">—</span>
                </td>

                <!-- Status -->
                <td class="px-5 py-4">
                  <select
                    :value="job.status"
                    :class="[
                      'rounded-full border px-2.5 py-1.5 text-xs font-medium outline-none',
                      statusClass(job.status),
                    ]"
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
                <td class="px-5 py-4">
                  <div
                    class="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"
                  >
                    <button
                      type="button"
                      class="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                      title="Status history"
                      @click="openHistory(job)"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="9" />

                        <path d="M12 7v5l3 2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      title="Edit"
                      @click="openEditForm(job)"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M12 20h9" />

                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                      @click="requestDelete(job)"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M3 6h18" />

                        <path d="M8 6V4h8v2" />

                        <path d="M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty -->
        <div v-if="applications.length === 0" class="px-6 py-20 text-center">
          <div
            class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </div>

          <h3 class="mt-4 text-sm font-medium text-gray-800">
            No applications yet
          </h3>

          <p class="mt-1 text-sm text-gray-400">
            Add one manually or let JobTrack detect your next application.
          </p>

          <button
            class="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            @click="openAddForm"
          >
            Add application
          </button>
        </div>

        <!-- No Match -->
        <div
          v-else-if="filteredApplications.length === 0"
          class="px-6 py-16 text-center"
        >
          <h3 class="text-sm font-medium text-gray-800">No matches found</h3>

          <p class="mt-1 text-sm text-gray-400">
            Try changing your search or filters.
          </p>

          <button
            class="mt-4 text-sm font-medium text-blue-600"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>
      </section>
    </div>

    <ApplicationForm
      v-if="showForm"
      :application="editingApplication"
      :error="formError"
      @save="saveForm"
      @cancel="closeForm"
    />

    <AuthModal
      v-if="showAuthModal"
      @close="showAuthModal = false"
      @authenticated="handleAuthenticated"
    />

    <div
      v-if="historyApplication"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      @click.self="closeHistory"
    >
      <div
        class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div
          class="flex items-start justify-between border-b border-slate-100 px-6 py-5"
        >
          <div>
            <h2 class="text-base font-semibold text-slate-900">
              Application history
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              {{ historyApplication.jobTitle }}
              ·
              {{ historyApplication.company }}
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            @click="closeHistory"
          >
            ✕
          </button>
        </div>

        <div class="max-h-[65vh] overflow-y-auto px-6 py-5">
          <div
            v-if="isHistoryLoading"
            class="py-10 text-center text-sm text-slate-400"
          >
            Loading history…
          </div>

          <div
            v-else-if="statusHistory.length === 0"
            class="py-10 text-center text-sm text-slate-400"
          >
            No status history yet.
          </div>

          <div v-else class="relative">
            <div class="absolute bottom-3 left-7px top-3 w-px bg-slate-200" />

            <div
              v-for="event in statusHistory"
              :key="event.id"
              class="relative flex gap-4 pb-6 last:pb-0"
            >
              <div
                class="relative z-10 mt-1 h-15px w-15px shrink-0 rounded-full border-[3px] border-white bg-blue-500 shadow-sm"
              />

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    :class="[
                      'rounded-full border px-2 py-1 text-xs font-medium',
                      statusClass(event.status),
                    ]"
                  >
                    {{ event.status }}
                  </span>

                  <span
                    v-if="event.source === 'migration'"
                    class="text-[11px] text-slate-400"
                  >
                    imported history
                  </span>

                  <span v-else class="text-[11px] capitalize text-slate-400">
                    {{ event.source }}
                  </span>
                </div>

                <p class="mt-1.5 text-xs text-slate-400">
                  {{ formatHistoryDate(event.occurredAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="pendingDelete"
      title="Delete application?"
      :description="`Remove ${pendingDelete.jobTitle} at ${pendingDelete.company} from your tracker?`"
      confirm-label="Delete"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />

    <!-- Toasts -->
    <div class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 space-y-2">
      <ToastNotification
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        @close="dismissToast(toast.id)"
      />
    </div>
  </div>
</template>
