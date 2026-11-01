import { aiLog, money, notify, online } from "@aicore-fivem/lib/server";
import {
  type ActionResult,
  fail,
  readId,
  readText,
} from "@aicore-fivem/lib/shared";
import type { MoneyRef } from "@aicore-fivem/shared";
import { Locale } from "common";
import type { ActionKind } from "common/bank";
import { core } from "../core";
import { settings } from "../panel";
import { bossJobs } from "./accounts";
import { AtmAllowance } from "./atmAllowance";
import { inReach, pushBalance, sessions } from "./sessions";

const atmAllowance = new AtmAllowance();

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

/** Deposit, withdraw or transfer on the open screen's account. */
export function runAction(
  source: number,
  account: string,
  kind: ActionKind,
  amount: number,
  target: unknown,
): ActionResult {
  const session = sessions.get(source);
  if (!session || !inReach(source, session)) return fail("BANK_ERR_FAR");
  const job = account.startsWith("job:") ? account.slice(4) : null;
  if (job && !bossJobs(source).includes(job)) return fail("BANK_ERR_DENIED");
  if (session.where === "atm" && (kind === "deposit" || job))
    return fail("BANK_ERR_ATM");
  // ATM points come from the client: instead of trusting them more, ATM actions have their own panel limits.
  const charId = online.charId(source) ?? null;
  const atm = session.where === "atm";
  if (atm && amount > settings.value.atmLimit)
    return fail("BANK_ERR_ATM_LIMIT");
  if (
    atm &&
    (charId === null ||
      amount > atmAllowance.left(charId, settings.value.atmDailyLimit))
  )
    return fail("BANK_ERR_ATM_DAILY");

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
  if (atm && charId !== null) atmAllowance.spend(charId, amount);
  if (job) {
    pushBalance(job);
    aiLog("society", `${kind} $${amount} on ${job}`, {
      source,
      metadata: { job, kind, amount },
    });
  }
  return { ok: true };
}
