import { createApp } from "vue";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import ConfirmPrompt from "../../components/ConfirmPrompt.vue";
import ToastInPage from "../../components/ToastInPage.vue";
import type { JobApplication } from "../types";

export function promptUserForConfirmation(
  ctx: ContentScriptContext,
  jobDetails: Partial<JobApplication>,
): Promise<boolean> {
  return new Promise(async (resolve) => {
    // WXT's helper creates an isolated Shadow DOM container
    const ui = await createShadowRootUi(ctx, {
      name: "jobtrack-prompt",
      position: "inline",
      anchor: "body",
      append: "last",
      onMount(container) {
        // Mount our Vue app INSIDE the Shadow DOM
        const app = createApp(ConfirmPrompt, {
          jobTitle: jobDetails.jobTitle || "this role",
          company: jobDetails.company || "this company",

          onConfirm: () => {
            app.unmount();
            ui.remove();
            resolve(true);
          },
          onCancel: () => {
            app.unmount();
            ui.remove();
            resolve(false);
          },
        });

        app.mount(container);
        return app;
      },
      onRemove(app) {
        app?.unmount();
      },
    });  // Display the UI
  ui.mount();
  });
}

export function showToast(
  ctx: ContentScriptContext,
  message: string,
  duration = 3500,
  type: "success" | "warning" = "success",
) {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;";
  document.body.appendChild(container);

  const app = createApp(ToastInPage, { message, duration, type });
  app.mount(container);

  setTimeout(() => {
    app.unmount();
    container.remove();
  }, duration + 400);
}
