import {
  isNear,
  onClientCallback,
  onClientEvent,
  online,
} from "@aicore-fivem/lib/server";
import {
  type ActionResult,
  fail,
  readId,
  readInt,
  readText,
  readVec3,
} from "@aicore-fivem/lib/shared";
import {
  EVENTS,
  type ActionKind,
  type BankSnapshot,
  type HistoryPage,
  type Where,
} from "common/bank";
import { core } from "../core";
import { accounts, bossJobs } from "./accounts";
import { runAction } from "./action";
import { loadHistory } from "./history";
import { ATM_REACH, atBank, sessions } from "./sessions";

onClientCallback(
  EVENTS.open,
  {
    args: ([where, atm]) => {
      const point = where === "atm" ? readVec3(atm) : null;
      if (where !== "bank" && !point) return null;
      return [where as Where, point] as const;
    },
  },
  (source, where, atm): BankSnapshot | ActionResult => {
    if (
      where === "bank"
        ? !atBank(source)
        : !atm || !isNear(source, atm, ATM_REACH)
    )
      return fail("BANK_ERR_FAR");
    const list = accounts(source);
    sessions.set(source, {
      where,
      atm,
      jobs: list.flatMap((a) =>
        a.key.startsWith("job:") ? [a.key.slice(4)] : [],
      ),
    });
    return {
      ok: true,
      where,
      cash: core.GetMoney(source, "cash") ?? 0,
      accounts: list,
    };
  },
);

onClientCallback(
  EVENTS.history,
  {
    args: ([account, before]) => {
      const name = readText(account, 64);
      const id = before === null ? null : readId(before);
      return name !== null && (before === null || id !== null)
        ? [name, id]
        : null;
    },
    rate: { count: 4, windowMs: 2000 },
  },
  async (source, account, before): Promise<HistoryPage | ActionResult> => {
    const character = online.character(source);
    if (!character || !sessions.has(source)) return fail("BANK_ERR_FAR");
    const job = account.startsWith("job:") ? account.slice(4) : null;
    if (job && !bossJobs(source).includes(job)) return fail("BANK_ERR_DENIED");
    const page = job
      ? await loadHistory("job", job, "bank", before)
      : await loadHistory("character", String(character.id), "bank", before);
    return { ok: true, account, ...page };
  },
);

onClientCallback(
  EVENTS.action,
  {
    args: ([account, kind, amount, target]) => {
      const name = readText(account, 64);
      const value = readInt(amount, 1, 100_000_000);
      return name !== null &&
        value !== null &&
        (kind === "deposit" || kind === "withdraw" || kind === "transfer")
        ? [name, kind as ActionKind, value, target]
        : null;
    },
    lock: true,
  },
  (source, account, kind, amount, target): ActionResult =>
    runAction(source, account, kind, amount, target),
);

onClientEvent(EVENTS.close, (source) => void sessions.delete(source));
