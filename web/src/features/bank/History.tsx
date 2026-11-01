import { useEffect } from "react";
import { fetchNui } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { VirtualList } from "../../components/VirtualList";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { historyLoading, store, useAppSelector } from "../../store/bank";
import { groupDigits } from "@aicore-fivem/lib/shared";

const OK = { mockData: { ok: true } };
const money = (n: number) => `$${groupDigits(n)}`;

const loadHistory = (account: string, before: number | null) => {
  store.dispatch(historyLoading(account));
  void fetchNui("history", { account, before }, OK);
};

/** The account's transactions (tgiann-bank history rows): direction chip, reason and time, signed amount. */
export function History({ account }: { account: string }) {
  const t = useLang();
  const history = useAppSelector((s) => s.bank.history[account]);
  useEffect(() => {
    if (!history) loadHistory(account, null);
  }, [account, history]);
  const rows = history?.rows ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[0.6vh] rounded-[0.8vh] bg-header p-[1.2vh] pb-0">
      <div className="flex h-[4vh] shrink-0 items-center gap-[1vh] border-b border-white/10">
        <span className="flex size-[2.6vh] items-center justify-center rounded-[0.6vh] bg-white/3 text-[1.3vh]">
          <FontAwesomeIcon icon={faClockRotateLeft} />
        </span>
        <span className="text-[1.3vh] font-medium">{t("UI_HISTORY")}</span>
      </div>
      <VirtualList
        className="min-h-0 flex-1 pb-[0.6vh]"
        items={rows}
        estimateSize={4.6}
        gap={0.2}
        getItemKey={(r) => r.id}
        empty={
          <div className="flex h-full flex-col items-center justify-center gap-[1vh] text-text-3">
            <FontAwesomeIcon
              icon={faClockRotateLeft}
              className="text-[2.4vh]"
            />
            <p className="text-[1.3vh]">
              {history?.loading ? t("UI_LOADING") : t("UI_NO_HISTORY")}
            </p>
          </div>
        }
        renderItem={(r, i) => {
          const income = r.amount >= 0;
          return (
            <div className="flex h-[4.6vh] items-center gap-[1vh] rounded-[0.8vh] px-[0.6vh] transition-colors duration-150 hover:bg-white/3">
              <span
                className={cn(
                  "flex size-[2.8vh] shrink-0 items-center justify-center rounded-full text-[1.2vh]",
                  income
                    ? "bg-tgi-green-10 text-tgi-green"
                    : "bg-danger-bg text-danger",
                )}
              >
                <FontAwesomeIcon icon={income ? faArrowDown : faArrowUp} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[1.3vh] leading-[1.3] font-semibold">
                  {r.reason}
                </span>
                <span className="text-[1.1vh] leading-[1.3] text-text-3 tabular-nums">
                  {new Date(r.at).toLocaleString()}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 text-[1.4vh] font-semibold tabular-nums",
                  income ? "text-tgi-green" : "text-danger",
                )}
              >
                {income ? "+" : "-"}
                {money(Math.abs(r.amount))}
              </span>
              {i === rows.length - 1 && history?.more && !history.loading && (
                <LoadMore account={account} before={r.id} />
              )}
            </div>
          );
        }}
      />
    </div>
  );
}

/** Asks for the next page once the last row is drawn. */
function LoadMore({ account, before }: { account: string; before: number }) {
  useEffect(() => loadHistory(account, before), [account, before]);
  return null;
}
