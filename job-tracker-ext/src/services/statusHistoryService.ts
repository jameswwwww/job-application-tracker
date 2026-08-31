import { db } from "./db";

import type { ApplicationStatusEvent } from "../types";

export async function getStatusHistory(
  applicationId: string,
): Promise<ApplicationStatusEvent[]> {
  const events = await db.statusEvents
    .where("applicationId")
    .equals(applicationId)
    .toArray();

  return events.sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}
