import { useEffect, useState } from "react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ActionKind, NuiMessage } from "../../resource/common/bank";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { MOCK_HISTORY, MOCK_OPEN } from "./dev/mock";
import { setTexts, useLang } from "./lib/lang";
import { cn } from "./lib/utils";
import { balanceSet, cashSet, closed, historyPage, opened, selected, store, useAppSelector } from "./store/bank";
import { History } from "./features/History";

type Data<A extends NuiMessage["action"]> = Extract<NuiMessage, { action: A }>["data"];
const OK = { mockData: { ok: true } };
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 };
const HISTORY_MOCK = { mockData: MOCK_HISTORY, mockDelay: 300 };
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

// The client is this resource's own code: its messages are trusted in shape (types from common/bank).
const onOpen = (d: Data<"open">) => {
  setTexts(d.texts);
  store.dispatch(opened(d.snapshot));
};
/** The bank: accounts on the left, deposit / withdraw / transfer and the account's history on the right. */
export function App() {
  const t = useLang();
  const { snapshot, selected: account } = useAppSelector((s) => s.bank);
  const [kind, setKind] = useState<ActionKind>("withdraw");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  useNuiEvent("open", onOpen, OPEN_MOCK);
  useNuiEvent("close", () => store.dispatch(closed()));
  useNuiEvent<Data<"cash">>("cash", (d) => store.dispatch(cashSet(d)));
  useNuiEvent<Data<"balance">>("balance", (d) => store.dispatch(balanceSet(d)));
  useNuiEvent<Data<"history">>("history", (d) => store.dispatch(historyPage(d)), HISTORY_MOCK);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && store.getState().bank.snapshot && void fetchNui("close", undefined, OK);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!snapshot) return null;
  const atm = snapshot.where === "atm";
  const kinds: ActionKind[] = atm ? ["withdraw", "transfer"] : ["deposit", "withdraw", "transfer"];
  const value = Math.floor(Number(amount));
  const valid = Number.isFinite(value) && value > 0 && (kind !== "transfer" || target.trim() !== "");
  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const targetId = /^\d+$/.test(target.trim()) ? Number(target.trim()) : target.trim();
    const result: unknown = await fetchNui("action", { account, kind, amount: value, target: kind === "transfer" ? targetId : undefined }, OK).catch(() => null);
    setBusy(false);
    if (typeof result === "object" && result !== null && "ok" in result && result.ok === true) setAmount("");
  };

  return (
    <div className="fixed inset-0 flex animate-fade items-center justify-center bg-[rgba(var(--bg-rgb),0.6)]">
      <section className="flex h-[66vh] w-[96vh] animate-rise gap-[2vh] rounded-[1.2vh] border border-line bg-panel p-[2.2vh] [box-shadow:0_2.4vh_6.4vh_rgba(0,0,0,0.5)]">
        <aside className="flex w-[30vh] flex-col gap-[1.2vh]">
          <span className="text-[1.2vh] uppercase tracking-[0.24em] text-text-3">{atm ? t("UI_ATM") : t("UI_BANK")}</span>
          {snapshot.accounts.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => store.dispatch(selected(a.key))}
              className={cn(
                "flex flex-col gap-[0.6vh] rounded-[1vh] border p-[1.6vh] text-left transition-colors duration-150",
                a.key === account ? "border-accent bg-[rgba(var(--accent-rgb),0.06)]" : "border-line bg-bg hover:bg-raised",
              )}
            >
              <span className="text-[1.3vh] text-text-3">{a.label}</span>
              <span className="text-[2.4vh] font-semibold tabular-nums text-text">{money(a.balance)}</span>
            </button>
          ))}
          <div className="mt-auto flex items-center justify-between rounded-[1vh] border border-line bg-bg p-[1.4vh]">
            <span className="text-[1.3vh] text-text-3">{t("UI_CASH")}</span>
            <span className="text-[1.8vh] font-semibold tabular-nums text-accent">{money(snapshot.cash)}</span>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-[1.6vh]">
          <header className="flex items-center justify-between">
            <div className="flex gap-[0.6vh]" role="tablist">
              {kinds.map((k) => (
                <Button key={k} role="tab" aria-selected={k === kind} size="sm" variant={k === kind ? "primary" : "secondary"} onClick={() => setKind(k)}>
                  {t(`UI_${k.toUpperCase()}`)}
                </Button>
              ))}
            </div>
            <Button variant="icon" aria-label={t("UI_CLOSE")} onClick={() => void fetchNui("close", undefined, OK)}>
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </header>
          <form
            className="flex gap-[0.8vh]"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {kind === "transfer" && <Input className="w-[18vh]" placeholder={t("UI_TARGET")} aria-label={t("UI_TARGET")} value={target} onChange={(e) => setTarget(e.target.value)} />}
            <Input type="number" min={1} placeholder={t("UI_AMOUNT")} aria-label={t("UI_AMOUNT")} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button type="submit" variant="filled" size="sm" className="h-[3.6vh]" busy={busy} disabled={!valid}>
              {t("UI_CONFIRM")}
            </Button>
          </form>
          <History account={account} />
        </div>
      </section>
    </div>
  );
}
