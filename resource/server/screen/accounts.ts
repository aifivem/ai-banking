import { definitions, online } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import type { AccountView } from "common/bank";
import { core } from "../core";

/** Society accounts the player runs: the bank account of every job where the player's grade is a boss grade. */
export function bossJobs(source: number): string[] {
  return online.jobs(source).filter((job) => {
    const grade = online.jobGrade(source, job);
    return grade !== null && definitions.job(job)?.grades[grade]?.boss === true;
  });
}

export function accounts(source: number): AccountView[] {
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
      label: definitions.job(job)?.label ?? job,
      balance: core.GetSharedMoney("job", job, "bank") ?? 0,
    });
  return list;
}
