import {
  callAction,
  notify,
  onPlayerData,
  onServerEvent,
} from "@aicore-fivem/lib/client";
import { isRecord, readText } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/bank";
import { loadHistory } from "./history";
import { page, screen } from "./screen";

onPlayerData("money", (money) => {
  if (screen.open && typeof money.cash === "number")
    page.send({ action: "cash", data: money.cash });
  if (screen.open && typeof money.bank === "number")
    page.send({
      action: "balance",
      data: { account: "personal", balance: money.bank },
    });
});
onServerEvent(
  EVENTS.balance,
  {
    args: ([account, balance]) =>
      typeof account === "string" && typeof balance === "number"
        ? [account, balance]
        : null,
  },
  (account, balance) => {
    if (screen.open)
      page.send({ action: "balance", data: { account, balance } });
  },
);

page.on(
  "history",
  (d) => {
    const account = isRecord(d) ? readText(d.account, 64) : null;
    return isRecord(d) && account !== null
      ? { account, before: typeof d.before === "number" ? d.before : null }
      : null;
  },
  ({ account, before }) => loadHistory(account, before),
);
page.on(
  "action",
  (d) =>
    isRecord(d) &&
    typeof d.account === "string" &&
    typeof d.kind === "string" &&
    typeof d.amount === "number"
      ? { account: d.account, kind: d.kind, amount: d.amount, target: d.target }
      : null,
  async ({ account, kind, amount, target }) => {
    const result = await callAction(
      EVENTS.action,
      [account, kind, amount, target],
      { fallback: "BANK_ERR_MONEY" },
    );
    if (result) notify(Locale("BANK_DONE"), "success", 2000);
    return { ok: result !== null };
  },
);
