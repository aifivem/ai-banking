import { AdminPanel } from "@aifivem/lib/server";
import { readBank, readOffice, readSettings } from "common/bank";
import { bankingSchema } from "./schema";

const panel = new AdminPanel(bankingSchema);
/** Panel content, kept current by the panel. */
export const settings = panel.view("settings", readSettings);
export const banks = panel.records("banks", readBank);
export const offices = panel.records("offices", readOffice);
