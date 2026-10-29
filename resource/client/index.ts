import { AdminWorld, hidePrompt, loadLocaleTexts, notify, onPlayerData, onPromptPressed, onServerEvent, optionalExport, showPrompt, triggerServerCallback, Zones } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, readBanks, readSettings, type BankSnapshot, type HistoryPage, type NuiMessage, type Where } from "common/bank";

const world = new AdminWorld(["banks", "settings"]);
const texts = loadLocaleTexts();
const BLIP_TEXT = "AIBANK_BLIP";
AddTextEntry(BLIP_TEXT, "~a~");
const send = (m: NuiMessage): void => SendNUIMessage(m);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const errorText = (v: unknown, fallback: string): string => {
  const key = isObj(v) && typeof v.error === "string" ? v.error : fallback;
  return texts[key] ?? key;
};

/** The bank screen: opened at a branch (prompt) or an ATM (ai-target option); money changes arrive as deltas. */
class Screen {
  open = false;

  async show(where: Where): Promise<void> {
    if (this.open) return;
    const raw: unknown = await triggerServerCallback(EVENTS.open, [where]).catch(() => null);
    if (!isObj(raw) || raw.ok !== true || !Array.isArray(raw.accounts) || typeof raw.cash !== "number") return notify(errorText(raw, "BANK_ERR_FAR"), "error");
    const snapshot: BankSnapshot = {
      ok: true,
      where,
      cash: raw.cash,
      accounts: raw.accounts.flatMap((a) => (isObj(a) && typeof a.key === "string" && typeof a.label === "string" && typeof a.balance === "number" ? [{ key: a.key, label: a.label, balance: a.balance }] : [])),
    };
    this.open = true;
    SetNuiFocus(true, true);
    send({ action: "open", data: { texts, snapshot } });
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    SetNuiFocus(false, false);
    send({ action: "close", data: null });
    emitNet(EVENTS.close);
  }
}

const screen = new Screen();

/** Branch zones with ai-core's prompt, blips; ATMs through ai-target when it runs. */
class Places {
  private readonly zones = new Zones();
  private blips: number[] = [];

  rebuild(): void {
    this.zones.clear();
    for (const blip of this.blips) RemoveBlip(blip);
    this.blips = [];
    for (const bank of readBanks(world.get("banks")).values()) {
      const id = `bank:${bank.id}`;
      this.zones.add(id, {
        shape: { type: "sphere", center: { x: bank.x, y: bank.y, z: bank.z }, radius: bank.radius },
        interval: 500,
        onEnter: () => showPrompt(id, Locale("BANK_PROMPT", bank.label)),
        onExit: () => hidePrompt(id),
      });
      if (!bank.blip) continue;
      const blip = AddBlipForCoord(bank.x, bank.y, bank.z);
      SetBlipSprite(blip, 108);
      SetBlipColour(blip, 2);
      SetBlipScale(blip, 0.7);
      SetBlipAsShortRange(blip, true);
      BeginTextCommandSetBlipName(BLIP_TEXT);
      AddTextComponentSubstringPlayerName(bank.label);
      EndTextCommandSetBlipName(blip);
      this.blips.push(blip);
    }
    const target = optionalExport("ai-target");
    const models = readSettings(world.get("settings")).atmModels;
    if (target && models.length) target.addModel(models, [{ name: "ai-banking:atm", label: Locale("ATM_USE"), icon: "fa-solid fa-credit-card", distance: 1.5, onSelect: () => void screen.show("atm") }]);
  }
}

const places = new Places();
places.rebuild();
world.onChange("banks", () => places.rebuild());
onPromptPressed((id) => {
  if (id.startsWith("bank:")) void screen.show("bank");
});

onPlayerData("money", (money) => {
  if (screen.open && typeof money.cash === "number") send({ action: "cash", data: money.cash });
  if (screen.open && typeof money.bank === "number") send({ action: "balance", data: { account: "personal", balance: money.bank } });
});
onServerEvent(EVENTS.balance, { args: ([account, balance]) => (typeof account === "string" && typeof balance === "number" ? [account, balance] : null) }, (account, balance) => {
  if (screen.open) send({ action: "balance", data: { account, balance } });
});

type Reply = (r: unknown) => void;
RegisterNuiCallback("close", (_d: unknown, cb: Reply) => {
  screen.close();
  cb({ ok: true });
});
RegisterNuiCallback("history", (d: unknown, cb: Reply) => {
  if (!isObj(d) || typeof d.account !== "string") return cb({ ok: false });
  const before = typeof d.before === "number" ? d.before : null;
  void triggerServerCallback(EVENTS.history, [d.account, before])
    .catch(() => null)
    .then((page) => {
      cb({ ok: true });
      if (isObj(page) && page.ok === true && Array.isArray(page.rows)) {
        const rows = page.rows.flatMap((r) =>
          isObj(r) && typeof r.id === "number" && typeof r.amount === "number" && typeof r.balance === "number" && typeof r.reason === "string" && typeof r.at === "number"
            ? [{ id: r.id, amount: r.amount, balance: r.balance, reason: r.reason, at: r.at }]
            : [],
        );
        const history: HistoryPage = { ok: true, account: String(page.account), rows, more: page.more === true };
        send({ action: "history", data: history });
      }
    });
});
RegisterNuiCallback("action", (d: unknown, cb: Reply) => {
  if (!isObj(d) || typeof d.account !== "string" || typeof d.kind !== "string" || typeof d.amount !== "number") return cb({ ok: false });
  void triggerServerCallback(EVENTS.action, [d.account, d.kind, d.amount, d.target]).catch(() => null).then((result) => {
    const ok = isObj(result) && result.ok === true;
    if (!ok) notify(errorText(result, "BANK_ERR_MONEY"), "error");
    else notify(Locale("BANK_DONE"), "success", 2000);
    cb({ ok });
  });
});
