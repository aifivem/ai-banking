import { callAction } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { EVENTS, type HistoryPage } from "common/bank";
import { page } from "./screen";

/** Asks the server for a history page of the account and sends it to the page. */
export async function loadHistory(
  account: string,
  before: number | null,
): Promise<void> {
  const reply = await callAction(EVENTS.history, [account, before], {
    fallback: "BANK_ERR_FAR",
  });
  if (reply && Array.isArray(reply.rows)) {
    const rows = reply.rows.flatMap((r) =>
      isRecord(r) &&
      typeof r.id === "number" &&
      typeof r.amount === "number" &&
      typeof r.balance === "number" &&
      typeof r.reason === "string" &&
      typeof r.at === "number"
        ? [
            {
              id: r.id,
              amount: r.amount,
              balance: r.balance,
              reason: r.reason,
              at: r.at,
            },
          ]
        : [],
    );
    const history: HistoryPage = {
      ok: true,
      account: String(reply.account),
      rows,
      more: reply.more === true,
    };
    page.send({ action: "history", data: history });
  }
}
