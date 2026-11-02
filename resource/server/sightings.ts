import { optionalExport } from "@aifivem/lib/server";
import { createLogger } from "@aifivem/lib/shared";
import { ResourceName } from "common";
import type { Where } from "common/bank";
import { settings } from "./panel";

const log = createLogger(ResourceName);

/** Tells ai-police the player used a branch or an ATM (a wanted player seen there); nothing while it does not run. */
export function reportSighting(source: number, place: Where): void {
  if (!settings.value.reportSightings) return;
  try {
    optionalExport("ai-police")?.ReportSighting(source, place);
  } catch (error) {
    log.warn(`ai-police ReportSighting failed for ${source}`, error);
  }
}
