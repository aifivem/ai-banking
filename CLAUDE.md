# ai-banking

Banks (branches from the panel) and ATMs (world props, a lib `Points` model point: prompt or target): personal account, society accounts for job bosses, deposit, withdraw, transfer to online players, transaction history. Society money for QB scripts (`qb-banking`, `Renewed-Banking` names). Depends on ai-core (accounts, ledger, jobs).

## Decisions

- No money of its own: every balance change goes through ai-core's exports (`AddMoney`, `RemoveMoney`, `*SharedMoney`); the history is read straight from ai-core's ledger table, read only, keyset paged (`server/history.ts`).
- Society accounts: the `bank` account of each job where the player's grade has `boss`.
- Transfers go to online players only (server id or citizen id), because ai-core keeps money in memory for online characters.
- The screen gets one snapshot on open; personal balance and cash follow ai-core's player data deltas, a society balance comes back as a delta after the screen's own action. ATMs only withdraw (up to the panel limit) and transfer.

## Contracts

- Callbacks and shapes: `resource/common/bank.ts`. Exports `GetAccountBalance(job)`, `AddMoney(job, amount, reason)`, `RemoveMoney(job, amount, reason)` (also as `qb-banking`; `Renewed-Banking` `getAccountMoney` / `addAccountMoney` / `removeAccountMoney`).
- Reads tables `ai_core_accounts`, `ai_core_transactions` (needs its own `add_convar_permission` line).

## Entry points

- Server: open, history, actions, exports `resource/server/index.ts`; ledger reads `server/history.ts`.
- Client: branch and ATM points, NUI bridge `resource/client/index.ts`.
- NUI (tgiann-bank look): shell and labelled header tabs `web/src/App.tsx`, card / accounts / activity (in and out of the loaded history page) / form / history in `web/src/features/`; preview `bun run webdev` (`?atm=1`).
