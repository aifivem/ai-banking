import { mysql } from "@aicore-fivem/mysql"
import type { Transaction } from "common/bank"

const PAGE = 30

/**
 * Reads ai-core's ledger (read only; ai-core alone writes balances and transactions). Keyset paging on the
 * `account_time` index, newest first.
 */
export async function loadHistory(
  ownerType: string,
  ownerId: string,
  account: string,
  beforeId: number | null
): Promise<{ rows: Transaction[]; more: boolean }> {
  const found = await mysql.scalar<number | null>(
    "SELECT id FROM ai_core_accounts WHERE owner_type = ? AND owner_id = ? AND name = ?",
    [ownerType, ownerId, account]
  )
  if (!found) return { rows: [], more: false }
  const rows = await mysql.query<
    Array<{
      id: number
      amount: number | string
      balance_after: number | string
      reason: string
      created_at: number
    }>
  >(
    `SELECT id, amount, balance_after, reason, created_at FROM ai_core_transactions
     WHERE account_id = ? ${beforeId ? "AND id < ?" : ""} ORDER BY created_at DESC, id DESC LIMIT ?`,
    beforeId ? [found, beforeId, PAGE + 1] : [found, PAGE + 1]
  )
  return {
    rows: rows
      .slice(0, PAGE)
      .map((r) => ({
        id: Number(r.id),
        amount: Number(r.amount),
        balance: Number(r.balance_after),
        reason: r.reason,
        at: Number(r.created_at),
      })),
    more: rows.length > PAGE,
  }
}
