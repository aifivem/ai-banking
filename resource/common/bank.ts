import {
  bool,
  int,
  num,
  type PlacePed,
  readBlipStyle,
  readPlacePed,
  record,
  str,
} from "@aifivem/lib/shared";

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
  /** Callback: (office id) -> { ok, balance } the salary waiting in the paycheck office (the office menu's snapshot). */
  paycheckBalance: "ai-banking:paycheckBalance",
  /** Callback: (office id | null = the open branch screen, amount | null = everything) -> { ok } takes salary out. */
  paycheck: "ai-banking:paycheck",
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
  /** The branch screen offers the salary waiting in ai-core's paycheck office. */
  paycheckAtBranches: boolean;
  /** The paycheck office points (`offices` file) exist. */
  paycheckOffices: boolean;
  /** Bank and ATM visits are reported to ai-police (wanted sightings) while it runs. */
  reportSightings: boolean;
}

/** A place of a records file: a bank branch or a paycheck office. */
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
  /**
   * Salary waiting in the paycheck office; null when this screen offers none (ATM, panel switch off, ai-core's account
   * mode with nothing waiting).
   */
  paycheck: number | null;
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
    paycheckAtBranches: bool(s.paycheckAtBranches, true),
    paycheckOffices: bool(s.paycheckOffices, true),
    reportSightings: bool(s.reportSightings, true),
  };
}

/** One place of a records file; `blipStyle` is the fallback blip look. */
function readPlace(
  id: string,
  v: Record<string, unknown>,
  blipStyle: Bank["blipStyle"],
): Bank {
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
    blipStyle: readBlipStyle(style, blipStyle),
  };
}

/** One branch of the panel's records file (`panel.records` / `world.records`). */
export const readBank = (id: string, v: Record<string, unknown>): Bank =>
  readPlace(id, v, { sprite: 108, color: 2, scale: 0.7 });

/** One paycheck office of the panel's `offices` file. */
export const readOffice = (id: string, v: Record<string, unknown>): Bank =>
  readPlace(id, v, { sprite: 500, color: 2, scale: 0.7 });

/** Client -> NUI messages. */
export type NuiMessage =
  | {
      action: "open";
      data: { texts: Record<string, string>; snapshot: BankSnapshot };
    }
  | { action: "cash"; data: number }
  | { action: "balance"; data: { account: string; balance: number } }
  | { action: "paycheck"; data: number }
  | { action: "history"; data: HistoryPage }
  | { action: "close"; data: null };
