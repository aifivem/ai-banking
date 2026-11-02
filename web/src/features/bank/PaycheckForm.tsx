import { useState } from "react";
import { fetchNui } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDollarSign } from "@fortawesome/free-solid-svg-icons";
import { groupDigits } from "@aifivem/lib/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useLang } from "../../lib/lang";
import { KIND_ICON } from "./ActionForm";

const OK = { mockData: { ok: true } };

/** The salary waiting in ai-core's paycheck office: take an amount or everything into the pay account. */
export function PaycheckForm({ balance }: { balance: number }) {
  const t = useLang();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Math.floor(Number(amount));
  const valid = Number.isFinite(value) && value > 0 && value <= balance;

  /** `take` null = everything; the new balance arrives as a delta. */
  const withdraw = async (take: number | null) => {
    setBusy(true);
    const result: unknown = await fetchNui(
      "paycheck",
      { amount: take },
      OK,
    ).catch(() => null);
    setBusy(false);
    if (
      typeof result === "object" &&
      result !== null &&
      "ok" in result &&
      result.ok === true
    )
      setAmount("");
  };

  return (
    <div className="flex shrink-0 flex-col gap-[1vh] rounded-[0.8vh] bg-header p-[1.2vh]">
      <div className="flex h-[4vh] items-center gap-[1vh] border-b border-white/10">
        <span className="flex size-[2.6vh] items-center justify-center rounded-[0.6vh] bg-white/3 text-[1.3vh]">
          <FontAwesomeIcon icon={KIND_ICON.paycheck} />
        </span>
        <span className="flex-1 text-[1.3vh] font-medium">
          {t("UI_PAYCHECK")}
        </span>
        <span className="text-[1.2vh] text-text-3">
          {t("UI_PAYCHECK_WAITING")}
        </span>
        <span className="text-[1.6vh] font-bold text-tgi-green tabular-nums">
          ${groupDigits(balance)}
        </span>
      </div>
      <form
        className="flex gap-[0.6vh]"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void withdraw(value);
        }}
      >
        <Input
          type="number"
          min={1}
          max={balance}
          icon={faDollarSign}
          placeholder={t("UI_AMOUNT")}
          aria-label={t("UI_AMOUNT")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button
          disabled={busy || balance <= 0}
          onClick={() => void withdraw(null)}
        >
          {t("UI_PAYCHECK_ALL")}
        </Button>
        <Button type="submit" variant="primary" busy={busy} disabled={!valid}>
          {!busy && (
            <FontAwesomeIcon
              icon={KIND_ICON.withdraw}
              data-icon="inline-start"
            />
          )}
          {t("UI_CONFIRM")}
        </Button>
      </form>
    </div>
  );
}
