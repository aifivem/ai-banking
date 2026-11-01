import { AdminPanel } from "@aicore-fivem/lib/server";
import { readBank, readSettings } from "common/bank";
import { bankingSchema } from "./schema";

const panel = new AdminPanel(bankingSchema);
/** Panel content, kept current by the panel. */
export const settings = panel.view("settings", readSettings);
export const banks = panel.records("banks", readBank);
