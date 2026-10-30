import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  isNear,
  money,
  notify,
  onClientCallback,
  onClientEvent,
  online,
  PlayerMap,
  provideExport,
  registerExport,
  resourceExport,
} from "@aicore-fivem/lib/server";
import {
  fail,
  isRecord,
  readFinite,
  readId,
  readInt,
  readText,
  type ActionResult,
  type Vec3,
} from "@aicore-fivem/lib/shared";
import type { MoneyRef } from "@aicore-fivem/shared";
import { Locale } from "common";
import {
  EVENTS,
  readBank,
  readSettings,
  type AccountView,
  type ActionKind,
  type BankSnapshot,
  type HistoryPage,
  type Where,
} from "common/bank";
import { loadHistory } from "./history";
import { bankingSchema } from "./schema";

const core = resourceExport("ai-core");
const panel = new AdminPanel(bankingSchema);
/** Panel content, kept current by the panel. */
const settings = panel.view("settings", readSettings);
const banks = panel.records("banks", readBank);
aiLogChannels({ transfers: {}, society: {} });

/** How far from the ATM point it opened at a player may stand (the server cannot see ATM props, so it keeps that point). */
const ATM_REACH = 3;

/** An open screen: where it is (an ATM only withdraws and transfers), the ATM's point, the society accounts it shows. */
interface Session {
  where: Where;
  atm: Vec3 | null;
  jobs: string[];
}
const sessions = new PlayerMap<Session>();

function atBank(source: number): boolean {
  for (const bank of banks.values())
    if (isNear(source, bank, bank.radius + 2)) return true;
  return false;
}

/** The player still stands where the screen opened (a branch, or the ATM point). */
function inReach(source: number, session: Session): boolean {
  return session.atm ? isNear(source, session.atm, ATM_REACH) : atBank(source);
}

/** Society accounts the player runs: the bank account of every job where the player's grade is a boss grade. */
function bossJobs(source: number): string[] {
  const defs = core.GetJobDefinitions();
  return (core.GetJobs(source) ?? [])
    .filter((m) => defs[m.job]?.grades[m.grade]?.boss === true)
    .map((m) => m.job);
}

function accounts(source: number): AccountView[] {
  const defs = core.GetJobDefinitions();
  const list: AccountView[] = [
    {
      key: "personal",
      label: Locale("ACCOUNT_PERSONAL"),
      balance: core.GetMoney(source, "bank") ?? 0,
    },
  ];
  for (const job of bossJobs(source))
    list.push({
      key: `job:${job}`,
      label: defs[job]?.label ?? job,
      balance: core.GetSharedMoney("job", job, "bank") ?? 0,
    });
  return list;
}

/** The ATM point a client names when it opens an ATM screen. */
function readPoint(value: unknown): Vec3 | null {
  if (!isRecord(value)) return null;
  const [x, y, z] = [
    readFinite(value.x),
    readFinite(value.y),
    readFinite(value.z),
  ];
  return x !== null && y !== null && z !== null ? { x, y, z } : null;
}

onClientCallback(
  EVENTS.open,
  {
    args: ([where, atm]) => {
      const point = where === "atm" ? readPoint(atm) : null;
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

/** The source of a transfer target: a server id or an online character's citizen id. */
function targetOf(target: unknown): number | null {
  const id = readId(target);
  if (id !== null) return online.character(id) ? id : null;
  const citizen = readText(target, 32);
  if (citizen === null) return null;
  return (
    core.GetSourceByCitizenId(citizen.toUpperCase()) ??
    core.GetSourceByCitizenId(citizen)
  );
}

/** A society account's new balance to every screen that shows it (the acting boss and any other boss of that job). */
function pushBalance(job: string): void {
  const balance = core.GetSharedMoney("job", job, "bank") ?? 0;
  for (const [viewer, session] of sessions)
    if (session.jobs.includes(job))
      emitNet(EVENTS.balance, viewer, `job:${job}`, balance);
}

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
  (source, account, kind, amount, target): ActionResult => {
    const session = sessions.get(source);
    if (!session || !inReach(source, session)) return fail("BANK_ERR_FAR");
    const job = account.startsWith("job:") ? account.slice(4) : null;
    if (job && !bossJobs(source).includes(job)) return fail("BANK_ERR_DENIED");
    if (session.where === "atm" && (kind === "deposit" || job))
      return fail("BANK_ERR_ATM");
    if (
      session.where === "atm" &&
      kind === "withdraw" &&
      amount > settings.value.atmLimit
    )
      return fail("BANK_ERR_ATM_LIMIT");

    const cash: MoneyRef = { source, account: "cash" };
    const bank: MoneyRef = job
      ? { owner: "job", id: job, account: "bank" }
      : { source, account: "bank" };
    if (kind === "deposit") {
      if (!money.transfer(cash, bank, amount, "bank:deposit"))
        return fail("BANK_ERR_MONEY");
    } else if (kind === "withdraw") {
      if (!money.transfer(bank, cash, amount, "bank:withdraw"))
        return fail("BANK_ERR_MONEY");
    } else {
      const to = targetOf(target);
      if (to === null || to === source) return fail("BANK_ERR_TARGET");
      const fee = Math.ceil((amount * settings.value.transferFee) / 100);
      if (
        !money.transfer(
          bank,
          { source: to, account: "bank" },
          amount,
          "bank:transfer",
          fee,
        )
      )
        return fail("BANK_ERR_MONEY");
      notify(to, Locale("BANK_RECEIVED", amount), "success");
      aiLog("transfers", `sent $${amount} (fee $${fee}) from ${account}`, {
        source,
        target: to,
        metadata: { amount, fee, account },
      });
    }
    if (job) {
      pushBalance(job);
      aiLog("society", `${kind} $${amount} on ${job}`, {
        source,
        metadata: { job, kind, amount },
      });
    }
    return { ok: true };
  },
);

onClientEvent(EVENTS.close, (source) => void sessions.delete(source));

/** A script changed a society account: open screens of it follow. */
function changed(job: string, ok: boolean): boolean {
  if (ok) pushBalance(job);
  return ok;
}

/** Society money for QB scripts: qb-banking and Renewed-Banking names, an account is a job name. */
const society: Record<string, (...args: unknown[]) => unknown> = {
  GetAccountBalance: (account) =>
    typeof account === "string"
      ? (core.GetSharedMoney("job", account, "bank") ?? 0)
      : 0,
  AddMoney: (account, amount, reason) =>
    typeof account === "string" &&
    (readFinite(amount) ?? 0) > 0 &&
    changed(
      account,
      core.AddSharedMoney(
        "job",
        account,
        "bank",
        amount as number,
        typeof reason === "string" ? reason : "script",
      ),
    ),
  RemoveMoney: (account, amount, reason) =>
    typeof account === "string" &&
    (readFinite(amount) ?? 0) > 0 &&
    changed(
      account,
      core.RemoveSharedMoney(
        "job",
        account,
        "bank",
        amount as number,
        typeof reason === "string" ? reason : "script",
      ),
    ),
};
for (const [name, fn] of Object.entries(society)) {
  registerExport(name, fn);
  provideExport("qb-banking", name, fn);
}
provideExport(
  "Renewed-Banking",
  "getAccountMoney",
  society.GetAccountBalance ?? (() => 0),
);
provideExport(
  "Renewed-Banking",
  "addAccountMoney",
  society.AddMoney ?? (() => false),
);
provideExport(
  "Renewed-Banking",
  "removeAccountMoney",
  society.RemoveMoney ?? (() => false),
);
