import {
  callAction,
  loadLocaleTexts,
  NuiScreen,
} from "@aicore-fivem/lib/client";
import { isRecord, readFinite } from "@aicore-fivem/lib/shared";
import { NUI_LAYER } from "@aicore-fivem/shared";
import {
  EVENTS,
  type BankSnapshot,
  type NuiMessage,
  type Where,
} from "common/bank";

// Stacking among NUI pages (`NUI_LAYER`): set at start, not left to load order.
SetNuiZindex(NUI_LAYER.screen);

const texts = loadLocaleTexts();
/** The page; closing it tells the server, which stops sending balance deltas. */
export const page = new NuiScreen<NuiMessage>("bank", {
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

export const screen = new Screen();
