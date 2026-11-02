import { isNear, notify, onClientCallback } from "@aifivem/lib/server";
import {
  type ActionResult,
  fail,
  groupDigits,
  isRecord,
  readFinite,
  readInt,
  readText,
} from "@aifivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/bank";
import { core } from "./core";
import { offices, settings } from "./panel";
import { inReach, sessions } from "./screen/sessions";

/** ai-core's `WithdrawPaycheck` refusals this resource has texts for; anything else is `PAYCHECK_ERR_FAILED`. */
const KNOWN_ERRORS = new Set([
  "PAYCHECK_ERR_EMPTY",
  "PAYCHECK_ERR_AMOUNT",
  "PAYCHECK_ERR_ACCOUNT",
]);

/** Salary waiting in ai-core's paycheck office (metadata `paycheck`). */
export function paycheckBalance(source: number): number {
  return Math.max(0, readFinite(core.GetPaycheckBalance(source)) ?? 0);
}

/**
 * The branch screen's paycheck: always in ai-core's office mode (even at 0), in account mode only a balance left from
 * office mode; null = no Paycheck tab.
 */
export function branchPaycheck(source: number): number | null {
  const balance = paycheckBalance(source);
  return balance > 0 || core.GetPaycheckMode() === "office" ? balance : null;
}

/** Pays `amount` (null = everything) of the waiting salary into the pay account; the amount paid or a lang key. */
function withdraw(
  source: number,
  amount: number | null,
): { amount: number } | { error: string } {
  const reply: unknown = core.WithdrawPaycheck(source, amount ?? undefined);
  if (isRecord(reply) && reply.ok === true) {
    const paid = readFinite(reply.amount);
    if (paid !== null) return { amount: paid };
  }
  const error = isRecord(reply) ? reply.error : null;
  return {
    error:
      typeof error === "string" && KNOWN_ERRORS.has(error)
        ? error
        : "PAYCHECK_ERR_FAILED",
  };
}

/** The player stands where salary is paid out: the open branch screen (`office` null) or that paycheck office. */
function atPaycheckPlace(source: number, office: string | null): boolean {
  if (office === null) {
    const session = sessions.get(source);
    return (
      settings.value.paycheckAtBranches &&
      session?.where === "bank" &&
      inReach(source, session)
    );
  }
  const place = offices.get(office);
  return (
    settings.value.paycheckOffices &&
    core.GetPaycheckMode() === "office" &&
    place !== undefined &&
    isNear(source, place, place.radius + 2)
  );
}

onClientCallback(
  EVENTS.paycheckBalance,
  {
    args: ([office]) => {
      const id = readText(office, 64);
      return id === null ? null : ([id] as const);
    },
    rate: { count: 4, windowMs: 2000 },
  },
  (source, office): ActionResult<{ balance: number }> =>
    atPaycheckPlace(source, office)
      ? { ok: true, balance: paycheckBalance(source) }
      : fail("PAYCHECK_ERR_FAR"),
);

onClientCallback(
  EVENTS.paycheck,
  {
    args: ([office, amount]) => {
      const id = office == null ? null : readText(office, 64);
      const value = amount == null ? null : readInt(amount, 1, 100_000_000);
      return (office != null && id === null) ||
        (amount != null && value === null)
        ? null
        : ([id, value] as const);
    },
    lock: true,
  },
  (source, office, amount): ActionResult => {
    if (!atPaycheckPlace(source, office)) return fail("PAYCHECK_ERR_FAR");
    const result = withdraw(source, amount);
    if ("error" in result) return fail(result.error);
    notify(
      source,
      Locale("PAYCHECK_PAID", groupDigits(result.amount)),
      "success",
    );
    return { ok: true };
  },
);
