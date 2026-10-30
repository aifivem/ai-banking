import en from "../../../locales/en.json"

/** Browser preview only (`bun run webdev`): `?atm=1` opens an ATM. */
const atm = new URLSearchParams(window.location.search).get("atm") !== null
const now = Date.now()

export const MOCK_OPEN = {
  texts: en,
  snapshot: {
    ok: true as const,
    where: atm ? ("atm" as const) : ("bank" as const),
    cash: 2450,
    accounts: [
      { key: "personal", label: "Personal account", balance: 48200 },
      { key: "job:police", label: "LSPD", balance: 1250000 },
    ],
  },
}

export const MOCK_HISTORY = {
  ok: true as const,
  account: "personal",
  more: false,
  rows: [
    {
      id: 9,
      amount: 1200,
      balance: 48200,
      reason: "paycheck",
      at: now - 3_600_000,
    },
    {
      id: 8,
      amount: -15,
      balance: 47000,
      reason: "shop:shop_innocence",
      at: now - 7_200_000,
    },
    {
      id: 7,
      amount: -45000,
      balance: 47015,
      reason: "vehicle:sultan",
      at: now - 86_400_000,
    },
    {
      id: 6,
      amount: 500,
      balance: 92015,
      reason: "bank:deposit",
      at: now - 90_000_000,
    },
  ],
}
