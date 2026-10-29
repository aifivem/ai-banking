import { useEffect } from "react";
import { fetchNui } from "fivem-nui-react";
import { VirtualList } from "../components/VirtualList";
import { useLang } from "../lib/lang";
import { cn } from "../lib/utils";
import { historyLoading, store, useAppSelector } from "../store/bank";

const OK = { mockData: { ok: true } };
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

const loadHistory = (account: string, before: number | null) => {
  store.dispatch(historyLoading(account));
  void fetchNui("history", { account, before }, OK);
};

export function History({ account }: { account: string }) {
  const t = useLang();
  const history = useAppSelector((s) => s.bank.history[account]);
  useEffect(() => {
    if (!history) loadHistory(account, null);
  }, [account, history]);
  const rows = history?.rows ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[0.8vh]">
      <span className="text-[1.2vh] uppercase tracking-[0.24em] text-text-3">{t("UI_HISTORY")}</span>
      <VirtualList
        className="min-h-0 flex-1"
        items={rows}
        estimateSize={4.8}
        gap={0.4}
        getItemKey={(r) => r.id}
        empty={<p className="py-[3vh] text-center text-[1.3vh] text-text-3">{history?.loading ? t("UI_LOADING") : t("UI_NO_HISTORY")}</p>}
        renderItem={(r, i) => (
          <div className="flex h-[4.8vh] items-center justify-between rounded-[0.6vh] bg-bg px-[1.2vh]">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[1.3vh] text-text-2">{r.reason}</span>
              <span className="text-[1.1vh] text-text-3">{new Date(r.at).toLocaleString()}</span>
            </div>
            <span className={cn("text-[1.4vh] font-semibold tabular-nums", r.amount >= 0 ? "text-accent" : "text-danger")}>
              {r.amount >= 0 ? "+" : "-"}
              {money(Math.abs(r.amount))}
            </span>
            {i === rows.length - 1 && history?.more && !history.loading && <LoadMore account={account} before={r.id} />}
          </div>
        )}
      />
    </div>
  );
}

/** Asks for the next page once the last row is drawn. */
function LoadMore({ account, before }: { account: string; before: number }) {
  useEffect(() => loadHistory(account, before), [account, before]);
  return null;
}

