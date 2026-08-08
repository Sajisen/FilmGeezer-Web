import { SUPPORT_EMAIL_ALERT_WORKER_INTERVAL_MILLISECONDS } from "./supportEmailAlert.constants.js";
import { processDueSupportEmailAlerts } from "./supportEmailAlert.service.js";

let timer: NodeJS.Timeout | null = null;
let activePass: Promise<void> | null = null;

function runPass(): void {
  if (activePass) {
    return;
  }

  activePass = processDueSupportEmailAlerts()
    .catch((error) => {
      console.error("[support-email] Worker pass failed.", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    })
    .finally(() => {
      activePass = null;
    });
}

export function startSupportEmailAlertWorker(): void {
  if (timer) {
    return;
  }

  runPass();

  timer = setInterval(
    runPass,
    SUPPORT_EMAIL_ALERT_WORKER_INTERVAL_MILLISECONDS,
  );

  timer.unref();
}

export async function stopSupportEmailAlertWorker(): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (activePass) {
    await activePass;
  }
}
