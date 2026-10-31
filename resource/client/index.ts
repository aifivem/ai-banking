import {
  AdminWorld,
  callAction,
  loadLocaleTexts,
  notify,
  NuiScreen,
  onPlayerData,
  onServerEvent,
  Points,
} from "@aicore-fivem/lib/client";
import {
  isRecord,
  readFinite,
  readText,
  RecordObjects,
} from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  EVENTS,
  readBank,
  readSettings,
  type BankSnapshot,
  type HistoryPage,
  type NuiMessage,
  type Where,
} from "common/bank";

const world = new AdminWorld(["banks", "settings"]);
const settings = world.view("settings", readSettings);
const texts = loadLocaleTexts();
/** The page; closing it tells the server, which stops sending balance deltas. */
const page = new NuiScreen<NuiMessage>("bank", {
  onClose: () => emitNet(EVENTS.close),
});

/** The bank screen: opened at a branch point or an ATM (ai-target option); money changes arrive as deltas. */
class Screen {
  get open(): boolean {
    return page.isOpen;
  }

  /** `atm`: the ATM prop's position (the server keeps it and checks the player stays there). */
  async show(where: Where, atm: number | null = null): Promise<void> {
    if (page.isOpen) return;
    let point: { x: number; y: number; z: number } | null = null;
    if (atm !== null) {
      const [x = 0, y = 0, z = 0] = GetEntityCoords(atm, false);
      point = { x, y, z };
    }
    const raw = await callAction(EVENTS.open, [where, point], {
      fallback: "BANK_ERR_FAR",
    });
    const cash = readFinite(raw?.cash);
    if (!raw || !Array.isArray(raw.accounts) || cash === null) return;
    const snapshot: BankSnapshot = {
      ok: true,
      where,
      cash,
      accounts: raw.accounts.flatMap((a) =>
        isRecord(a) &&
        typeof a.key === "string" &&
        typeof a.label === "string" &&
        typeof a.balance === "number"
          ? [{ key: a.key, label: a.label, balance: a.balance }]
          : [],
      ),
    };
    page.open({ action: "open", data: { texts, snapshot } });
  }
}

const screen = new Screen();

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

onPlayerData("money", (money) => {
  if (screen.open && typeof money.cash === "number")
    page.send({ action: "cash", data: money.cash });
  if (screen.open && typeof money.bank === "number")
    page.send({
      action: "balance",
      data: { account: "personal", balance: money.bank },
    });
});
onServerEvent(
  EVENTS.balance,
  {
    args: ([account, balance]) =>
      typeof account === "string" && typeof balance === "number"
        ? [account, balance]
        : null,
  },
  (account, balance) => {
    if (screen.open)
      page.send({ action: "balance", data: { account, balance } });
  },
);

page.on(
  "history",
  (d) => {
    const account = isRecord(d) ? readText(d.account, 64) : null;
    return isRecord(d) && account !== null
      ? { account, before: typeof d.before === "number" ? d.before : null }
      : null;
  },
  async ({ account, before }) => {
    const reply = await callAction(EVENTS.history, [account, before], {
      fallback: "BANK_ERR_FAR",
    });
    if (reply && Array.isArray(reply.rows)) {
      const rows = reply.rows.flatMap((r) =>
        isRecord(r) &&
        typeof r.id === "number" &&
        typeof r.amount === "number" &&
        typeof r.balance === "number" &&
        typeof r.reason === "string" &&
        typeof r.at === "number"
          ? [
              {
                id: r.id,
                amount: r.amount,
                balance: r.balance,
                reason: r.reason,
                at: r.at,
              },
            ]
          : [],
      );
      const history: HistoryPage = {
        ok: true,
        account: String(reply.account),
        rows,
        more: reply.more === true,
      };
      page.send({ action: "history", data: history });
    }
  },
);
page.on(
  "action",
  (d) =>
    isRecord(d) &&
    typeof d.account === "string" &&
    typeof d.kind === "string" &&
    typeof d.amount === "number"
      ? { account: d.account, kind: d.kind, amount: d.amount, target: d.target }
      : null,
  async ({ account, kind, amount, target }) => {
    const result = await callAction(
      EVENTS.action,
      [account, kind, amount, target],
      { fallback: "BANK_ERR_MONEY" },
    );
    if (result) notify(Locale("BANK_DONE"), "success", 2000);
    return { ok: result !== null };
  },
);
