import { useState } from "react";
import { fetchNui } from "fivem-nui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowRightArrowLeft, faArrowUp, faDollarSign, faUser } from "@fortawesome/free-solid-svg-icons";
import type { ActionKind } from "../../../resource/common/bank";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useLang } from "../lib/lang";

const OK = { mockData: { ok: true } };
export const KIND_ICON = { deposit: faArrowDown, withdraw: faArrowUp, transfer: faArrowRightArrowLeft } as const;

/** Deposit / withdraw / transfer of the picked account: section title, pill inputs and the one green button. */
export function ActionForm({ account, kind }: { account: string; kind: ActionKind }) {
  const t = useLang();
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Math.floor(Number(amount));
  const valid = Number.isFinite(value) && value > 0 && (kind !== "transfer" || target.trim() !== "");
  const label = t(`UI_${kind.toUpperCase()}`);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const targetId = /^\d+$/.test(target.trim()) ? Number(target.trim()) : target.trim();
    const result: unknown = await fetchNui("action", { account, kind, amount: value, target: kind === "transfer" ? targetId : undefined }, OK).catch(() => null);
    setBusy(false);
    if (typeof result === "object" && result !== null && "ok" in result && result.ok === true) setAmount("");
  };

  return (
    <div className="flex shrink-0 flex-col gap-[1vh] rounded-[0.8vh] bg-header p-[1.2vh]">
      <div className="flex h-[4vh] items-center gap-[1vh] border-b border-white/10">
        <span className="flex size-[2.6vh] items-center justify-center rounded-[0.6vh] bg-white/3 text-[1.3vh]">
          <FontAwesomeIcon icon={KIND_ICON[kind]} />
        </span>
        <span className="text-[1.3vh] font-medium">{label}</span>
      </div>
      <form
        className="flex gap-[0.6vh]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {kind === "transfer" && <Input className="w-[22vh] shrink-0" icon={faUser} placeholder={t("UI_TARGET")} aria-label={t("UI_TARGET")} value={target} onChange={(e) => setTarget(e.target.value)} />}
        <Input type="number" min={1} icon={faDollarSign} placeholder={t("UI_AMOUNT")} aria-label={t("UI_AMOUNT")} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button type="submit" variant="primary" busy={busy} disabled={!valid}>
          {!busy && <FontAwesomeIcon icon={KIND_ICON[kind]} data-icon="inline-start" />}
          {t("UI_CONFIRM")}
        </Button>
      </form>
    </div>
  );
}
