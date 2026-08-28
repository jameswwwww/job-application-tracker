import { createApp } from "vue";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import ConfirmPrompt from "../../components/ConfirmPrompt.vue";
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
    });

    // Display the UI
    ui.mount();
  });
}
