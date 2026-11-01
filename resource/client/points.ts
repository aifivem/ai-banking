import { Points } from "@aicore-fivem/lib/client";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { readBank } from "common/bank";
import { screen } from "./screen/screen";
import { settings, world } from "./world";

/** Branch points (with blips) and the ATM models, as prompts or targets. */
const points = new Points();

/** The ATM model point follows the settings' model list. */
function addAtms(): void {
  const models = settings.value.atmModels;
  if (models.length)
    points.addModel("atm", {
      models,
      label: Locale("ATM_USE"),
      icon: "credit-card",
      radius: 1.5,
      onPressed: (entity) => screen.show("atm", entity),
    });
  else points.remove("atm");
}

/** One point per branch; an edited branch rebuilds only its own point. */
new RecordObjects(world, "banks", readBank, (id, bank) => {
  points.add(`bank:${id}`, {
    ped: bank.ped ?? undefined,
    coords: { x: bank.x, y: bank.y, z: bank.z },
    label: Locale("BANK_PROMPT", bank.label),
    icon: "building-columns",
    radius: bank.radius,
    blip: bank.blip ? { ...bank.blipStyle, label: bank.label } : undefined,
    onPressed: () => screen.show("bank"),
  });
  return () => points.remove(`bank:${id}`);
});
addAtms();
world.onChange("settings", addAtms);
