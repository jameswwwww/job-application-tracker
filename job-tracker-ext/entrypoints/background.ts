import { processDetectedApplication } from "../src/services/storageService";
import { syncCurrentUserApplications } from "../src/services/syncService";

import type { JobApplication } from "../src/types";

import { mergeJobContext } from "../src/utils/jobIdentity";

const SYNC_ALARM = "jobtrack-sync";

const BASE_SYNC_MINUTES = 5;
const MAX_SYNC_MINUTES = 60;
const SYNC_BACKOFF_STORAGE_KEY = "jobtrackSyncConsecutiveFailures";

const JOB_CONTEXT_PREFIX = "jobtrack-job-context-";

function contextKey(tabId: number) {
  return `${JOB_CONTEXT_PREFIX}${tabId}`;
}

function syncPeriodMinutes(failures: number): number {
  // Exponential backoff: 5, 10, 20, 40, 60 (capped)
  const minutes = BASE_SYNC_MINUTES * Math.pow(2, failures);
  return Math.min(minutes, MAX_SYNC_MINUTES);
}

async function scheduleNextSync() {
  const stored = await browser.storage.local.get(SYNC_BACKOFF_STORAGE_KEY);
  const failures = typeof stored[SYNC_BACKOFF_STORAGE_KEY] === "number"
    ? stored[SYNC_BACKOFF_STORAGE_KEY]
    : 0;

  const period = syncPeriodMinutes(failures);

  browser.alarms.create(SYNC_ALARM, { delayInMinutes: period });

  if (failures > 0) {
    console.log(`JobTrack: next sync in ${period} min (backoff, ${failures} failures)`);
  }
}

async function recordSyncSuccess() {
  await browser.storage.local.set({
    [SYNC_BACKOFF_STORAGE_KEY]: 0,
    jobtrackLastSyncAt: new Date().toISOString(),
    jobtrackLastSyncError: null,
  });
}

async function recordSyncFailure(message: string) {
  const stored = await browser.storage.local.get(SYNC_BACKOFF_STORAGE_KEY);
  const prev = typeof stored[SYNC_BACKOFF_STORAGE_KEY] === "number"
    ? stored[SYNC_BACKOFF_STORAGE_KEY]
    : 0;

  await browser.storage.local.set({
    [SYNC_BACKOFF_STORAGE_KEY]: prev + 1,
    jobtrackLastSyncError: message,
  });
}

async function runSync() {
  try {
    const result = await syncCurrentUserApplications();

    console.log("JobTrack: background sync completed", result);

    if (result.errors > 0) {
      await recordSyncFailure(`${result.errors} item(s) failed to sync.`);
    } else {
      await recordSyncSuccess();
    }

    await scheduleNextSync();

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("JobTrack: background sync failed", error);
    await recordSyncFailure(message);
    await scheduleNextSync();
    throw error;
  }
}

export default defineBackground(() => {
  console.log("Job Tracker Background Service Worker initialized.");

  // First sync fires shortly after startup,
  // then self-schedules with backoff.
  browser.alarms.create(SYNC_ALARM, {
    delayInMinutes: 1,
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) {
      runSync().catch(console.error);
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    browser.storage.session.remove(contextKey(tabId)).catch((error) => {
      console.warn("JobTrack: Unable to clear tab job context", error);
    });
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "CACHE_JOB_CONTEXT") {
      const tabId = _sender.tab?.id;

      if (tabId === undefined) {
        sendResponse({
          status: "Error",
        });

        return;
      }

      const key = contextKey(tabId);

      browser.storage.session.get(key).then(async (stored) => {
        const previous = stored[key];

        const previousContext =
          previous && typeof previous === "object"
            ? (previous as Partial<JobApplication>)
            : null;

        const incomingContext =
          message.payload && typeof message.payload === "object"
            ? (message.payload as Partial<JobApplication>)
            : {};

        const nextContext = mergeJobContext(previousContext, incomingContext);

        await browser.storage.session.set({
          [key]: nextContext,
        });

        sendResponse({
          status: "Success",
        });
      });

      return true;
    }

    if (message.type === "GET_JOB_CONTEXT") {
      const tabId = _sender.tab?.id;

      if (tabId === undefined) {
        sendResponse({
          status: "Success",
          payload: null,
        });

        return;
      }

      const key = contextKey(tabId);

      browser.storage.session.get(key).then((stored) => {
        sendResponse({
          status: "Success",
          payload: stored[key] ?? null,
        });
      });

      return true;
    }

    if (message.type === "CLEAR_JOB_CONTEXT") {
      const tabId = _sender.tab?.id;

      if (tabId === undefined) {
        sendResponse({
          status: "Success",
        });

        return;
      }

      browser.storage.session.remove(contextKey(tabId)).then(() => {
        sendResponse({
          status: "Success",
        });
      });

      return true;
    }

    if (message.type === "APPLICATION_DETECTED") {
      processDetectedApplication(message.payload)
        .then(() => {
          sendResponse({
            status: "Success",
          });
        })
        .catch((error) => {
          console.error("Failed to process application:", error);

          sendResponse({
            status: "Error",

            message: error.message,
          });
        });

      return true;
    }

    if (message.type === "SYNC_NOW") {
      runSync()
        .then((result) => {
          if (result.errors > 0) {
            sendResponse({
              status: "Error",

              message: `${result.errors} item(s) failed to sync.`,

              result,
            });

            return;
          }

          sendResponse({
            status: "Success",
            result,
          });
        })
        .catch((error) => {
          sendResponse({
            status: "Error",

            message: error instanceof Error ? error.message : "Sync failed",
          });
        });

      return true;
    }
  });
});
