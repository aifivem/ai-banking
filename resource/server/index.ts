import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  notify,
  onClientCallback,
  onClientEvent,
  provideExport,
  registerExport,
  resourceExport,
} from "@aicore-fivem/lib/server"
import { Locale } from "common"
import {
  EVENTS,
  readBanks,
  readSettings,
  type AccountView,
  type ActionKind,
  type BankSnapshot,
  type HistoryPage,
  type Where,
} from "common/bank"
import { loadHistory } from "./history"
import { bankingSchema } from "./schema"

const core = resourceExport("ai-core")
const panel = new AdminPanel(bankingSchema)
/** Panel content, parsed again after every change. */
const content = {
  settings: readSettings(panel.get("settings")),
  banks: readBanks(panel.get("banks")),
}
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings")))
)
panel.onChange("banks", () => (content.banks = readBanks(panel.get("banks"))))
aiLogChannels({ transfers: {}, society: {} })

const fail = (error: string) => ({ ok: false as const, error })
/** Where each open screen is (an ATM only withdraws and transfers). */
const sessions = new Map<number, Where>()

function atBank(source: number): boolean {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)))
  for (const bank of content.banks.values())
    if (Math.hypot(x - bank.x, y - bank.y, z - bank.z) <= bank.radius + 2)
      return true
  return false
}

/** Society accounts the player runs: the bank account of every job where the player's grade is a boss grade. */
function bossJobs(source: number): string[] {
  const defs = core.GetJobDefinitions()
  return (core.GetJobs(source) ?? [])
    .filter((m) => defs[m.job]?.grades[m.grade]?.boss === true)
    .map((m) => m.job)
}

function accounts(source: number): AccountView[] {
  const defs = core.GetJobDefinitions()
  const list: AccountView[] = [
    {
      key: "personal",
      label: Locale("ACCOUNT_PERSONAL"),
      balance: core.GetMoney(source, "bank") ?? 0,
    },
  ]
  for (const job of bossJobs(source))
    list.push({
      key: `job:${job}`,
      label: defs[job]?.label ?? job,
      balance: core.GetSharedMoney("job", job, "bank") ?? 0,
    })
  return list
}

onClientCallback(
  EVENTS.open,
  { args: ([where]) => (where === "bank" || where === "atm" ? [where] : null) },
  (source, where) => {
    if (where === "bank" && !atBank(source)) return fail("BANK_ERR_FAR")
    sessions.set(source, where)
    const snapshot: BankSnapshot = {
      ok: true,
      where,
      cash: core.GetMoney(source, "cash") ?? 0,
      accounts: accounts(source),
    }
    return snapshot
  }
)

onClientCallback(
  EVENTS.history,
  {
    args: ([account, before]) =>
      typeof account === "string" &&
      (before === null || typeof before === "number")
        ? [account, before]
        : null,
    rate: { count: 4, windowMs: 2000 },
  },
  async (
    source,
    account,
    before
  ): Promise<HistoryPage | ReturnType<typeof fail>> => {
    const character = core.GetCharacter(source)
    if (!character || !sessions.has(source)) return fail("BANK_ERR_FAR")
    const job = account.startsWith("job:") ? account.slice(4) : null
    if (job && !bossJobs(source).includes(job)) return fail("BANK_ERR_DENIED")
    const page = job
      ? await loadHistory("job", job, "bank", before)
      : await loadHistory("character", String(character.id), "bank", before)
    return { ok: true, account, ...page }
  }
)

/** The source of a transfer target: a server id or an online character's citizen id. */
function targetOf(target: unknown): number | null {
  if (typeof target === "number" && core.GetCharacter(target)) return target
  if (typeof target === "string")
    return (
      core.GetSourceByCitizenId(target.trim().toUpperCase()) ??
      core.GetSourceByCitizenId(target.trim())
    )
  return null
}

onClientCallback(
  EVENTS.action,
  {
    args: ([account, kind, amount, target]) =>
      typeof account === "string" &&
      (kind === "deposit" || kind === "withdraw" || kind === "transfer") &&
      typeof amount === "number" &&
      Number.isInteger(amount) &&
      amount > 0 &&
      amount <= 100_000_000
        ? [account, kind as ActionKind, amount, target]
        : null,
    lock: true,
  },
  (source, account, kind, amount, target) => {
    const where = sessions.get(source)
    if (!where || (where === "bank" && !atBank(source)))
      return fail("BANK_ERR_FAR")
    const job = account.startsWith("job:") ? account.slice(4) : null
    if (job && !bossJobs(source).includes(job)) return fail("BANK_ERR_DENIED")
    if (where === "atm" && (kind === "deposit" || job))
      return fail("BANK_ERR_ATM")
    if (
      where === "atm" &&
      kind === "withdraw" &&
      amount > content.settings.atmLimit
    )
      return fail("BANK_ERR_ATM_LIMIT")

    if (kind === "deposit") {
      if (!core.RemoveMoney(source, "cash", amount, "bank:deposit"))
        return fail("BANK_ERR_MONEY")
      const ok = job
        ? core.AddSharedMoney(
            "job",
            job,
            "bank",
            amount,
            `deposit by ${source}`
          )
        : core.AddMoney(source, "bank", amount, "bank:deposit")
      if (!ok) core.AddMoney(source, "cash", amount, "bank:refund")
    } else if (kind === "withdraw") {
      const ok = job
        ? core.RemoveSharedMoney(
            "job",
            job,
            "bank",
            amount,
            `withdraw by ${source}`
          )
        : core.RemoveMoney(source, "bank", amount, "bank:withdraw")
      if (!ok) return fail("BANK_ERR_MONEY")
      core.AddMoney(source, "cash", amount, "bank:withdraw")
    } else {
      const to = targetOf(target)
      if (to === null || to === source) return fail("BANK_ERR_TARGET")
      const fee = Math.ceil((amount * content.settings.transferFee) / 100)
      const from = job
        ? core.RemoveSharedMoney(
            "job",
            job,
            "bank",
            amount + fee,
            `transfer to ${to}`
          )
        : core.RemoveMoney(source, "bank", amount + fee, "bank:transfer")
      if (!from) return fail("BANK_ERR_MONEY")
      core.AddMoney(to, "bank", amount, "bank:transfer")
      notify(to, Locale("BANK_RECEIVED", amount), "success")
      aiLog("transfers", `sent $${amount} (fee $${fee}) from ${account}`, {
        source,
        target: to,
        metadata: { amount, fee, account },
      })
    }
    if (job) {
      emitNet(
        EVENTS.balance,
        source,
        account,
        core.GetSharedMoney("job", job, "bank") ?? 0
      )
      aiLog("society", `${kind} $${amount} on ${job}`, {
        source,
        metadata: { job, kind, amount },
      })
    }
    return { ok: true }
  }
)

on("playerDropped", () => sessions.delete(Number(globalThis.source)))
onClientEvent(EVENTS.close, (source) => void sessions.delete(source))

/** Society money for QB scripts: qb-banking and Renewed-Banking names, an account is a job name. */
const society: Record<string, (...args: unknown[]) => unknown> = {
  GetAccountBalance: (account) =>
    typeof account === "string"
      ? (core.GetSharedMoney("job", account, "bank") ?? 0)
      : 0,
  AddMoney: (account, amount, reason) =>
    typeof account === "string" &&
    typeof amount === "number" &&
    core.AddSharedMoney(
      "job",
      account,
      "bank",
      amount,
      typeof reason === "string" ? reason : "script"
    ),
  RemoveMoney: (account, amount, reason) =>
    typeof account === "string" &&
    typeof amount === "number" &&
    core.RemoveSharedMoney(
      "job",
      account,
      "bank",
      amount,
      typeof reason === "string" ? reason : "script"
    ),
}
for (const [name, fn] of Object.entries(society)) {
  registerExport(name, fn)
  provideExport("qb-banking", name, fn)
}
provideExport(
  "Renewed-Banking",
  "getAccountMoney",
  society.GetAccountBalance ?? (() => 0)
)
provideExport(
  "Renewed-Banking",
  "addAccountMoney",
  society.AddMoney ?? (() => false)
)
provideExport(
  "Renewed-Banking",
  "removeAccountMoney",
  society.RemoveMoney ?? (() => false)
)
