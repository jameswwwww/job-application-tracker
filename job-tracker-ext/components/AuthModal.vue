<script setup lang="ts">
import { ref, computed } from "vue";

import { signIn, signUp } from "../src/services/authService";

const emit = defineEmits<{
  close: [];
  authenticated: [];
}>();

const mode = ref<"login" | "register">("login");

const email = ref("");
const password = ref("");

const loading = ref(false);
const error = ref("");
const message = ref("");

const title = computed(() =>
  mode.value === "login" ? "Welcome back" : "Create your account",
);

const description = computed(() =>
  mode.value === "login"
    ? "Sign in to sync your applications across devices."
    : "Create an account to keep your applications synced.",
);

async function submit() {
  error.value = "";
  message.value = "";

  if (!email.value.trim() || !password.value) {
    error.value = "Enter your email and password.";

    return;
  }

  if (password.value.length < 6) {
    error.value = "Password must be at least 6 characters.";

    return;
  }

  loading.value = true;

  try {
    if (mode.value === "register") {
      const data = await signUp(email.value.trim(), password.value);

      if (!data.session) {
        message.value = "Check your email to confirm your account.";

        return;
      }
    } else {
      await signIn(email.value.trim(), password.value);
    }

    emit("authenticated");
    emit("close");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Authentication failed.";
  } finally {
    loading.value = false;
  }
}

function switchMode() {
  mode.value = mode.value === "login" ? "register" : "login";

  error.value = "";
  message.value = "";
}
</script>

<template>
  <div
    class="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-420px rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
    >
      <!-- Logo -->
      <div
        class="mb-5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-900 text-white"
      >
        <svg
          width="20"
          height="20"
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

      <h2 class="m-0 text-xl font-semibold tracking-tight text-slate-900">
        {{ title }}
      </h2>

      <p class="mb-0 mt-1.5 text-sm leading-5 text-slate-500">
        {{ description }}
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-slate-700">
            Email
          </label>

          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-slate-700">
            Password
          </label>

          <input
            v-model="password"
            type="password"
            :autocomplete="
              mode === 'login' ? 'current-password' : 'new-password'
            "
            required
            placeholder="At least 6 characters"
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div
          v-if="error"
          class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
        >
          {{ error }}
        </div>

        <div
          v-if="message"
          class="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700"
        >
          {{ message }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{
            loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"
          }}
        </button>
      </form>

      <div class="mt-5 border-t border-slate-100 pt-4 text-center">
        <button
          type="button"
          class="border-0 bg-transparent text-sm text-slate-500"
          @click="switchMode"
        >
          {{
            mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"
          }}

          <span class="font-medium text-blue-600">
            {{ mode === "login" ? "Sign up" : "Sign in" }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
