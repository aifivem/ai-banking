import { provideExport, registerExport } from "@aicore-fivem/lib/server";
import { readFinite } from "@aicore-fivem/lib/shared";
import { core } from "./core";
import { pushBalance } from "./screen/sessions";

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
