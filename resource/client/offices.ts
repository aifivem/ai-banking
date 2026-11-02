import {
  callAction,
  GlobalKey,
  input,
  menu,
  Points,
  stateString,
} from "@aifivem/lib/client";
import { groupDigits, readFinite, RecordObjects } from "@aifivem/lib/shared";
import { CORE } from "@aifivem/shared";
import { Locale } from "common";
import { EVENTS, readOffice } from "common/bank";
import { settings, world } from "./world";

/** Paycheck office points (panel `offices`), built only while `settings.paycheckOffices` is on in ai-core's office mode. */
const points = new Points();

/** ai-core's `paycheck.mode`, replicated by ai-core. */
const mode = new GlobalKey(CORE.paycheckModeStateKey, stateString);
const officesOn = () =>
  settings.value.paycheckOffices && mode.get() === "office";

/** Takes `amount` (null = everything) of the waiting salary at the office; the server notifies the paid amount. */
async function withdraw(office: string, amount: number | null): Promise<void> {
  await callAction(EVENTS.paycheck, [office, amount], {
    fallback: "PAYCHECK_ERR_FAILED",
  });
}

/** The office menu: the waiting salary (one snapshot when it opens), take all or an amount. */
async function openOffice(office: string): Promise<void> {
  const reply = await callAction(EVENTS.paycheckBalance, [office], {
    fallback: "PAYCHECK_ERR_FAR",
  });
  const balance = readFinite(reply?.balance);
  if (balance === null) return;
  const empty = balance <= 0;
  const picked = await menu({
    title: Locale("PAYCHECK_TITLE"),
    items: [
      {
        id: "balance",
        label: Locale("PAYCHECK_WAITING", groupDigits(balance)),
        icon: "wallet",
        disabled: true,
      },
      {
        id: "all",
        label: Locale("PAYCHECK_ALL"),
        icon: "money-bill-wave",
        disabled: empty,
      },
      {
        id: "amount",
        label: Locale("PAYCHECK_SOME"),
        icon: "keyboard",
        disabled: empty,
      },
    ],
  });
  if (picked === "all") return withdraw(office, null);
  if (picked !== "amount") return;
  const values = await input({
    title: Locale("PAYCHECK_TITLE"),
    fields: [
      {
        name: "amount",
        label: Locale("PAYCHECK_AMOUNT"),
        type: "number",
        min: 1,
        max: balance,
        placeholder: groupDigits(balance),
      },
    ],
    confirm: Locale("PAYCHECK_CONFIRM"),
  });
  const amount = Math.floor(Number(values?.amount));
  if (Number.isFinite(amount) && amount > 0) await withdraw(office, amount);
}

const objects = new RecordObjects(
  world,
  "offices",
  readOffice,
  (id, office) => {
    if (!officesOn()) return;
    points.add(`office:${id}`, {
      ped: office.ped ?? undefined,
      coords: { x: office.x, y: office.y, z: office.z },
      label: Locale("PAYCHECK_PROMPT"),
      icon: "money-bill-wave",
      radius: office.radius,
      blip: office.blip
        ? { ...office.blipStyle, label: office.label }
        : undefined,
      onPressed: () => openOffice(id),
    });
    return () => points.remove(`office:${id}`);
  },
);

/** The switch and ai-core's mode turn every office on or off; other settings leave them alone. */
let shown = officesOn();
const follow = () => {
  if (officesOn() === shown) return;
  shown = officesOn();
  objects.rebuildAll();
};
world.onChange("settings", follow);
mode.onChange(follow);
