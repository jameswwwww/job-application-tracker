<script setup lang="ts">
import { reactive } from "vue";

import type {
  AnonymousSalarySubmission,
  SalaryCurrency,
  SalaryPeriod,
} from "../src/services/salarySubmissionService";

defineProps<{
  error?: string;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [values: AnonymousSalarySubmission];
  cancel: [];
}>();

const form = reactive({
  company: "",
  jobTitle: "",
  location: "",
  salaryMin: null as number | null,
  salaryMax: null as number | null,
  currency: "MYR" as SalaryCurrency,
  period: "month" as SalaryPeriod,
});

function submit() {
  emit("save", {
    ...form,
    salaryMin: Number(form.salaryMin),
    salaryMax: Number(form.salaryMax),
  });
}
</script>

<template>
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
    @click.self="emit('cancel')"
  >
    <form
      class="w-full max-w-xl rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
      @submit.prevent="submit"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            Share a salary range
          </h2>
          <p class="mt-1 text-sm leading-6 text-slate-500">
            Your account ID and application details are not stored with this submission.
          </p>
        </div>

        <button
          type="button"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
          @click="emit('cancel')"
        >
          ✕
        </button>
      </div>

      <div
        v-if="error"
        class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="text-[13px] font-medium text-slate-700">
          Company
          <input
            v-model="form.company"
            required
            maxlength="200"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </label>

        <label class="text-[13px] font-medium text-slate-700">
          Job title
          <input
            v-model="form.jobTitle"
            required
            maxlength="200"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </label>

        <label class="text-[13px] font-medium text-slate-700 sm:col-span-2">
          Location <span class="font-normal text-slate-400">(optional)</span>
          <input
            v-model="form.location"
            maxlength="200"
            placeholder="e.g. Kuala Lumpur"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </label>

        <label class="text-[13px] font-medium text-slate-700">
          Minimum
          <input
            v-model.number="form.salaryMin"
            required
            type="number"
            min="1"
            step="0.01"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </label>

        <label class="text-[13px] font-medium text-slate-700">
          Maximum
          <input
            v-model.number="form.salaryMax"
            required
            type="number"
            min="1"
            step="0.01"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </label>

        <label class="text-[13px] font-medium text-slate-700">
          Currency
          <select
            v-model="form.currency"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            <option value="MYR">MYR</option>
            <option value="SGD">SGD</option>
            <option value="USD">USD</option>
          </select>
        </label>

        <label class="text-[13px] font-medium text-slate-700">
          Pay period
          <select
            v-model="form.period"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </label>
      </div>

      <p class="mt-4 text-xs leading-5 text-slate-400">
        Sign-in is required only to deter spam; no user identifier is written to the salary dataset.
      </p>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="emit('cancel')"
        >
          Cancel
        </button>

        <button
          type="submit"
          :disabled="saving"
          class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ saving ? "Submitting…" : "Submit anonymously" }}
        </button>
      </div>
    </form>
  </div>
</template>
