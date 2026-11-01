import { isNear, PlayerMap } from "@aicore-fivem/lib/server";
import type { Vec3 } from "@aicore-fivem/lib/shared";
import { EVENTS, type Where } from "common/bank";
import { core } from "../core";
import { banks } from "../panel";

/** How far from the ATM point it opened at a player may stand (the server cannot see ATM props, so it keeps that point). */
export const ATM_REACH = 3;

/** An open screen: where it is (an ATM only withdraws and transfers), the ATM's point, the society accounts it shows. */
export interface Session {
  where: Where;
  atm: Vec3 | null;
  jobs: string[];
}
export const sessions = new PlayerMap<Session>();

export function atBank(source: number): boolean {
  for (const bank of banks.values())
    if (isNear(source, bank, bank.radius + 2)) return true;
  return false;
}

/** The player still stands where the screen opened (a branch, or the ATM point). */
export function inReach(source: number, session: Session): boolean {
  return session.atm ? isNear(source, session.atm, ATM_REACH) : atBank(source);
}

/** A society account's new balance to every screen that shows it (the acting boss and any other boss of that job). */
export function pushBalance(job: string): void {
  const balance = core.GetSharedMoney("job", job, "bank") ?? 0;
  for (const [viewer, session] of sessions)
    if (session.jobs.includes(job))
      emitNet(EVENTS.balance, viewer, `job:${job}`, balance);
}
