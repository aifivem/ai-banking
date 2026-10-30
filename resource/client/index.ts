import {
  AdminWorld,
  callAction,
  hud,
  loadLocaleTexts,
  notify,
  onPlayerData,
  onServerEvent,
  Points,
} from "@aicore-fivem/lib/client";
import { isRecord, readFinite, readText } from "@aicore-fivem/lib/shared";
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
const banks = world.records("banks", readBank);
const settings = world.view("settings", readSettings);
const texts = loadLocaleTexts();
const send = (m: NuiMessage): void => SendNUIMessage(m);

/** The bank screen: opened at a branch point or an ATM (ai-target option); money changes arrive as deltas. */
class Screen {
  open = false;

  /** `atm`: the ATM prop's position (the server keeps it and checks the player stays there). */
  async show(where: Where, atm: number | null = null): Promise<void> {
    if (this.open) return;
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
    this.open = true;
    SetNuiFocus(true, true);
    hud.hide("bank");
    send({ action: "open", data: { texts, snapshot } });
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    SetNuiFocus(false, false);
    hud.show("bank");
    send({ action: "close", data: null });
    emitNet(EVENTS.close);
  }
}

const screen = new Screen();

/** Branch points (with blips) and the ATM models, as prompts or targets. */
const points = new Points();
function rebuild(): void {
  points.clear();
  for (const bank of banks.values()) {
    points.add(`bank:${bank.id}`, {
      ped: bank.ped ?? undefined,
      coords: { x: bank.x, y: bank.y, z: bank.z },
      label: Locale("BANK_PROMPT", bank.label),
      icon: "building-columns",
      radius: bank.radius,
      blip: bank.blip ? { ...bank.blipStyle, label: bank.label } : undefined,
      onPressed: () => screen.show("bank"),
    });
  }
  const models = settings.value.atmModels;
  if (models.length)
    points.addModel("atm", {
      models,
      label: Locale("ATM_USE"),
      icon: "credit-card",
      radius: 1.5,
      onPressed: (entity) => screen.show("atm", entity),
    });
}

rebuild();
world.onChange("banks", rebuild);
world.onChange("settings", rebuild);

onPlayerData("money", (money) => {
  if (screen.open && typeof money.cash === "number")
    send({ action: "cash", data: money.cash });
  if (screen.open && typeof money.bank === "number")
    send({
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
    if (screen.open) send({ action: "balance", data: { account, balance } });
  },
);

type Reply = (r: unknown) => void;
RegisterNuiCallback("close", (_d: unknown, cb: Reply) => {
  screen.close();
  cb({ ok: true });
});
RegisterNuiCallback("history", (d: unknown, cb: Reply) => {
  const account = isRecord(d) ? readText(d.account, 64) : null;
  if (!isRecord(d) || account === null) return cb({ ok: false });
  const before = typeof d.before === "number" ? d.before : null;
  void callAction(EVENTS.history, [account, before], {
    fallback: "BANK_ERR_FAR",
  }).then((page) => {
    cb({ ok: true });
    if (page && Array.isArray(page.rows)) {
      const rows = page.rows.flatMap((r) =>
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
        account: String(page.account),
        rows,
        more: page.more === true,
      };
      send({ action: "history", data: history });
    }
  });
});
RegisterNuiCallback("action", (d: unknown, cb: Reply) => {
  if (
    !isRecord(d) ||
    typeof d.account !== "string" ||
    typeof d.kind !== "string" ||
    typeof d.amount !== "number"
  )
    return cb({ ok: false });
  void callAction(EVENTS.action, [d.account, d.kind, d.amount, d.target], {
    fallback: "BANK_ERR_MONEY",
  }).then((result) => {
    if (result) notify(Locale("BANK_DONE"), "success", 2000);
    cb({ ok: result !== null });
  });
});
