import {
  bool,
  int,
  num,
  type PlacePed,
  readBlipStyle,
  readPlacePed,
  record,
  str,
} from "@aicore-fivem/lib/shared";

/** ai-banking's contracts and panel content. No natives. */

export const EVENTS = {
  /** Callback: (where: "bank" | "atm", atm coords | null) -> BankSnapshot | { ok: false, error } opens the screen. */
  open: "ai-banking:open",
  /** Callback: (account, beforeId | null) -> HistoryPage, older transactions of an account. */
  history: "ai-banking:history",
  /** Callback: (account, kind, amount, target?) -> { ok } deposit, withdraw or transfer. */
  action: "ai-banking:action",
  /** Client -> server: () the screen closed. */
  close: "ai-banking:close",
  /** Server -> every viewer of a shared account: (account, balance) it changed through ai-banking. */
  balance: "ai-banking:client:balance",
} as const;

export type Where = "bank" | "atm";
export type ActionKind = "deposit" | "withdraw" | "transfer";

export interface Settings {
  atmModels: string[];
  /** Most one ATM action (withdrawal or transfer) moves. */
  atmLimit: number;
  /** Most one character moves through ATMs in 24 h (memory: a restart of ai-banking clears it). */
  atmDailyLimit: number;
  /** Percent taken from transfers to other players. */
  transferFee: number;
}

export interface Bank {
  /** NPC standing at the place (panel), null for none. */
  ped: PlacePed | null;
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  blip: boolean;
  blipStyle: { sprite: number; color: number; scale: number };
}

/** An account on the screen: `personal` (the character's bank) or `job:<name>` (a society account the boss runs). */
export interface AccountView {
  key: string;
  label: string;
  balance: number;
}

export interface BankSnapshot {
  ok: true;
  where: Where;
  cash: number;
  accounts: AccountView[];
}

export interface Transaction {
  id: number;
  amount: number;
  balance: number;
  reason: string;
  /** Epoch ms. */
  at: number;
}

export interface HistoryPage {
  ok: true;
  account: string;
  rows: Transaction[];
  /** More rows exist before the last one. */
  more: boolean;
}

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const models = Array.isArray(s.atmModels)
    ? s.atmModels.filter((m): m is string => typeof m === "string")
    : [];
  return {
    atmModels: models,
    atmLimit: int(s.atmLimit, 5000, 0, 10_000_000),
    atmDailyLimit: int(s.atmDailyLimit, 20_000, 0, 100_000_000),
    transferFee: num(s.transferFee, 0, 0, 50),
  };
}

/** One branch of the panel's records file (`panel.records` / `world.records`). */
export function readBank(id: string, v: Record<string, unknown>): Bank {
  const c = record(v.coords);
  const style = record(v.blipStyle);
  return {
    ped: readPlacePed(v.ped),
    id,
    label: str(v.label, id, 48),
    x: num(c.x, 0),
    y: num(c.y, 0),
    z: num(c.z, 0),
    radius: num(v.radius, 3, 1, 20),
    blip: bool(v.blip, true),
    blipStyle: readBlipStyle(style, { sprite: 108, color: 2, scale: 0.7 }),
  };
}

/** Client -> NUI messages. */
export type NuiMessage =
  | {
      action: "open";
      data: { texts: Record<string, string>; snapshot: BankSnapshot };
    }
  | { action: "cash"; data: number }
  | { action: "balance"; data: { account: string; balance: number } }
  | { action: "history"; data: HistoryPage }
  | { action: "close"; data: null };
