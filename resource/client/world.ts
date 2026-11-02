import { AdminWorld } from "@aifivem/lib/client";
import { readSettings } from "common/bank";

export const world = new AdminWorld(["banks", "settings"]);
export const settings = world.view("settings", readSettings);
