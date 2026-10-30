import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faUser, faWallet } from "@fortawesome/free-solid-svg-icons";
import type { BankSnapshot } from "../../../resource/common/bank";
import { useLang } from "../lib/lang";
import { cn } from "../lib/utils";
import { selected, store } from "../store/bank";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const iconOf = (key: string) => (key === "personal" ? faUser : faBriefcase);

/** Left column: the picked account as the green bank card, the other accounts to switch to, the player's cash. */
export function Accounts({ snapshot, account, atm }: { snapshot: BankSnapshot; account: string; atm: boolean }) {
  const t = useLang();
  const current = snapshot.accounts.find((a) => a.key === account) ?? snapshot.accounts[0];
  return (
    <aside className="flex min-h-0 flex-col gap-[1.2vh]">
      {current && (
        <div className="relative flex h-[18vh] shrink-0 flex-col justify-between overflow-hidden rounded-[1.2vh] border border-white/15 bg-tgi-green p-[1.4vh] text-tgi-green-text">
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(115deg,transparent_52%,rgba(255,255,255,0.16)_52%,rgba(255,255,255,0.16)_68%,transparent_68%)]"
          />
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_100%,rgba(0,0,0,0.12),transparent)]" />
          <div className="relative flex items-start justify-between gap-[1vh]">
            <span className="truncate font-display font-extrabold text-[1.6vh] leading-[1.2] tracking-[-0.01em] uppercase">{current.label}</span>
            <span className="shrink-0 text-[1.3vh] font-bold uppercase">{atm ? t("UI_ATM") : t("UI_BANK")}</span>
          </div>
          <div className="relative flex flex-col gap-[0.4vh]">
            <span className="text-[1.3vh] leading-none font-medium">{t("UI_BALANCE")}</span>
            <span className="text-[2.6vh] leading-none font-bold tabular-nums">{money(current.balance)}</span>
          </div>
        </div>
      )}
      {snapshot.accounts.length > 1 && (
        <div className="flex min-h-0 flex-col gap-[0.6vh]">
          <span className="text-[1.2vh] font-semibold text-text-3 uppercase">{t("UI_ACCOUNTS")}</span>
          <div className="flex min-h-0 flex-col gap-[0.5vh] overflow-y-auto">
            {snapshot.accounts.map((a) => {
              const on = a.key === account;
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => store.dispatch(selected(a.key))}
                  className={cn(
                    "flex h-[5vh] shrink-0 items-center gap-[1vh] rounded-[1vh] border px-[0.9vh] text-left transition-colors duration-150",
                    on ? "border-tgi-green bg-tgi-green-10" : "border-white/8 bg-white/3 hover:bg-white/6",
                  )}
                >
                  <span className={cn("flex size-[3.2vh] shrink-0 items-center justify-center rounded-full text-[1.3vh]", on ? "bg-tgi-green-15 text-tgi-green" : "bg-white/6 text-text-3")}>
                    <FontAwesomeIcon icon={iconOf(a.key)} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[1.3vh] font-semibold">{a.label}</span>
                  <span className="shrink-0 text-[1.3vh] font-semibold text-text-2 tabular-nums">{money(a.balance)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-auto flex h-[5vh] shrink-0 items-center gap-[1vh] rounded-[1vh] bg-header px-[0.9vh]">
        <span className="flex size-[3.2vh] items-center justify-center rounded-full bg-tgi-green-10 text-[1.3vh] text-tgi-green">
          <FontAwesomeIcon icon={faWallet} />
        </span>
        <span className="flex-1 text-[1.3vh] font-medium text-text-2">{t("UI_CASH")}</span>
        <span className="text-[1.6vh] font-bold text-tgi-green tabular-nums">{money(snapshot.cash)}</span>
      </div>
    </aside>
  );
}
