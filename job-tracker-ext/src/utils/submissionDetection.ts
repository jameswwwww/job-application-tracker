interface SubmissionDetectionOptions {
  successPhrases: string[];

  formSelectors?: string[];

  buttonSelectors?: string[];

  buttonPhrases?: string[];

  successConfidence?: number;

  fallbackConfidence?: number;

  fallbackDelayMs?: number;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function observeSubmissionSignals(
  onDetected: (confidence: number) => void,
  options: SubmissionDetectionOptions,
): () => void {
  const body = document.body;

  if (!body) {
    return () => {};
  }

  const successPhrases = options.successPhrases.map(normalizeText);

  const buttonPhrases = (options.buttonPhrases ?? []).map(normalizeText);

  const successConfidence = options.successConfidence ?? 1;

  const fallbackConfidence = options.fallbackConfidence ?? 0.75;

  const fallbackDelayMs = options.fallbackDelayMs ?? 2000;

  let finished = false;

  let fallbackScheduled = false;

  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  let observer: MutationObserver | null = null;

  function pageHasSuccess() {
    const text = normalizeText(document.body?.innerText);

    return successPhrases.some((phrase) => text.includes(phrase));
  }

  function cleanup() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
    }

    observer?.disconnect();

    document.removeEventListener("submit", handleSubmit, true);

    document.removeEventListener("click", handleClick, true);
  }

  function emitSuccess() {
    if (finished) {
      return;
    }

    finished = true;

    cleanup();

    onDetected(successConfidence);
  }

  /*
   * Final submit is useful evidence,
   * but not absolute proof.
   *
   * We emit a low-confidence event
   * after a short delay. Because it
   * remains < 0.8, JobTrack asks the
   * user for confirmation.
   *
   * The success observer stays alive.
   * If a real confirmation appears
   * later it can emit 1.0 as well.
   */
  function scheduleFallback() {
    if (finished || fallbackScheduled) {
      return;
    }

    fallbackScheduled = true;

    fallbackTimer = setTimeout(() => {
      fallbackTimer = null;
      fallbackScheduled = false;

      if (!finished) {
        onDetected(fallbackConfidence);
      }
    }, fallbackDelayMs);
  }

  function matchesSelector(element: Element, selectors: string[]) {
    return selectors.some((selector) => {
      try {
        return element.matches(selector) || Boolean(element.closest(selector));
      } catch {
        return false;
      }
    });
  }

  function handleSubmit(event: Event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const selectors = options.formSelectors ?? [];

    if (selectors.length > 0 && matchesSelector(form, selectors)) {
      scheduleFallback();
    }
  }

  function handleClick(event: Event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest("button, a, input[type='submit']");

    if (!button) {
      return;
    }

    const text = normalizeText(
      button instanceof HTMLInputElement ? button.value : button.textContent,
    );

    const selectorMatch = matchesSelector(
      button,
      options.buttonSelectors ?? [],
    );

    const phraseMatch = buttonPhrases.some((phrase) => text.includes(phrase));

    if (selectorMatch || phraseMatch) {
      scheduleFallback();
    }
  }

  /*
   * Confirmation page may already
   * be loaded when this script starts.
   */
  if (pageHasSuccess()) {
    queueMicrotask(emitSuccess);

    return cleanup;
  }

  observer = new MutationObserver(() => {
    if (pageHasSuccess()) {
      emitSuccess();
    }
  });

  observer.observe(body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  document.addEventListener("submit", handleSubmit, true);

  document.addEventListener("click", handleClick, true);

  return cleanup;
}
