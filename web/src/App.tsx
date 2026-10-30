import { useEffect, useState } from "react";
import { fetchNui, useNuiEvent } from "fivem-nui-react";
import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import type { ActionKind, NuiMessage } from "../../resource/common/bank";
import { Button } from "./components/ui/button";
import { MOCK_HISTORY, MOCK_OPEN } from "./dev/mock";
import { setTexts, useLang } from "./lib/lang";
import { cn } from "./lib/utils";
import {
  balanceSet,
  cashSet,
  closed,
  historyPage,
  opened,
  store,
  useAppSelector,
} from "./store/bank";
import { Accounts } from "./features/Accounts";
import { ActionForm, KIND_ICON } from "./features/ActionForm";
import { History } from "./features/History";

type Data<A extends NuiMessage["action"]> = Extract<
  NuiMessage,
  { action: A }
>["data"];
const OK = { mockData: { ok: true } };
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 };
const HISTORY_MOCK = { mockData: MOCK_HISTORY, mockDelay: 300 };
/** Header tab width + gap in vh, for the sliding green pill (every tab has the same width). */
const TAB_STEP = 13;

// The client is this resource's own code: its messages are trusted in shape (types from common/bank).
const onOpen = (d: Data<"open">) => {
  setTexts(d.texts);
  store.dispatch(opened(d.snapshot));
};
const close = () => void fetchNui("close", undefined, OK);

/** The bank (tgiann-bank look): header with icon tabs, the account card and list left, the action and the history right. */
export function App() {
  const t = useLang();
  const { snapshot, selected: account } = useAppSelector((s) => s.bank);
  const [kind, setKind] = useState<ActionKind>("withdraw");

  useNuiEvent("open", onOpen, OPEN_MOCK);
  useNuiEvent("close", () => store.dispatch(closed()));
  useNuiEvent<Data<"cash">>("cash", (d) => store.dispatch(cashSet(d)));
  useNuiEvent<Data<"balance">>("balance", (d) => store.dispatch(balanceSet(d)));
  useNuiEvent<Data<"history">>(
    "history",
    (d) => store.dispatch(historyPage(d)),
    HISTORY_MOCK,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && store.getState().bank.snapshot && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!snapshot) return null;
  const atm = snapshot.where === "atm";
  const kinds: ActionKind[] = atm
    ? ["withdraw", "transfer"]
    : ["deposit", "withdraw", "transfer"];
  const active = Math.max(0, kinds.indexOf(kind));

  return (
    <div className="fixed inset-0 flex animate-fade items-center justify-center">
      <section className="flex h-[54vh] w-[104vh] animate-rise flex-col overflow-hidden rounded-[1.4vh] bg-panel [box-shadow:0_2.4vh_6.4vh_rgba(0,0,0,0.6),inset_0_0.1vh_0_rgba(255,255,255,0.06)]">
        <header className="grid h-[6.4vh] shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-header px-[1.2vh]">
          <h1 className="font-display text-[1.6vh] leading-none font-extrabold tracking-[-0.01em] uppercase">
            {atm ? t("UI_ATM") : t("UI_BANK")}
          </h1>
          <div className="relative flex gap-[0.6vh]" role="tablist">
            <motion.span
              aria-hidden
              className="absolute top-0 left-0 h-[4vh] w-[12.4vh] rounded-[0.8vh] bg-tgi-green"
              initial={false}
              animate={{ x: `${active * TAB_STEP}vh` }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            />
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === kind}
                onClick={() => setKind(k)}
                className={cn(
                  "relative flex h-[4vh] w-[12.4vh] items-center justify-center gap-[0.8vh] rounded-[0.8vh] text-[1.3vh] transition-[background-color,color,transform] duration-150 active:[transform:scale(0.96)]",
                  k === kind
                    ? "font-bold text-tgi-green-text"
                    : "bg-control font-semibold text-text-3 hover:bg-control-hover hover:text-white",
                )}
              >
                <FontAwesomeIcon icon={KIND_ICON[k]} className="text-[1.4vh]" />
                {t(`UI_${k.toUpperCase()}`)}
              </button>
            ))}
          </div>
          <Button
            variant="icon"
            className="justify-self-end"
            aria-label={t("UI_CLOSE")}
            title={t("UI_CLOSE")}
            onClick={close}
          >
            <FontAwesomeIcon icon={faDoorOpen} />
          </Button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[33vh_minmax(0,1fr)] gap-[1.2vh] p-[1.2vh]">
          <Accounts snapshot={snapshot} account={account} atm={atm} />
          <div className="flex min-h-0 min-w-0 flex-col gap-[1.2vh]">
            <ActionForm account={account} kind={kind} />
            <History account={account} />
          </div>
        </div>
      </section>
    </div>
  );
}
