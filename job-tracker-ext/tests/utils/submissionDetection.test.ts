import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { observeSubmissionSignals } from "../../src/utils/submissionDetection";

describe("observeSubmissionSignals", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not detect a normal Apply button", async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
          <button id="apply">
            Apply now
          </button>
        `;

    const detected = vi.fn();

    const cleanup = observeSubmissionSignals(detected, {
      successPhrases: ["application submitted"],

      buttonPhrases: ["submit application"],

      fallbackDelayMs: 100,
    });

    document.querySelector<HTMLButtonElement>("#apply")?.click();

    await vi.advanceTimersByTimeAsync(200);

    expect(detected).not.toHaveBeenCalled();

    cleanup();
  });

  it("emits fallback confidence for final submit", async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
          <button id="submit">
            Submit application
          </button>
        `;

    const detected = vi.fn();

    const cleanup = observeSubmissionSignals(detected, {
      successPhrases: ["application submitted"],

      buttonPhrases: ["submit application"],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 100,
    });

    document.querySelector<HTMLButtonElement>("#submit")?.click();

    await vi.advanceTimersByTimeAsync(100);

    expect(detected).toHaveBeenCalledWith(0.75);

    cleanup();
  });

  it("can detect a second submit attempt", async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
          <button id="submit">
            Submit application
          </button>
        `;

    const detected = vi.fn();

    const cleanup = observeSubmissionSignals(detected, {
      successPhrases: ["application submitted"],

      buttonPhrases: ["submit application"],

      fallbackConfidence: 0.75,

      fallbackDelayMs: 100,
    });

    const button = document.querySelector<HTMLButtonElement>("#submit")!;

    button.click();

    await vi.advanceTimersByTimeAsync(100);

    button.click();

    await vi.advanceTimersByTimeAsync(100);

    expect(detected).toHaveBeenCalledTimes(2);

    cleanup();
  });
});
