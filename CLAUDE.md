# ai-banking

Banks (branches from the panel) and ATMs (world props, a lib `Points` model point: prompt or target): personal account, society accounts for job bosses, deposit, withdraw, transfer to online players, transaction history. Society money for QB scripts (`qb-banking`, `Renewed-Banking` names). Depends on ai-core (accounts, ledger, jobs).

## Decisions

- No money of its own: deposit, withdraw and transfer are one lib `money.transfer` each (both accounts and both ledger rows in one transaction, the transfer fee paid by the sender), the society exports use ai-core's `*SharedMoney`; the history is read straight from ai-core's ledger table, read only, keyset paged (`server/screen/history.ts`).
- Society accounts: the `bank` account of each job where the player's grade has `boss` (grades from lib `definitions.job`).
- Transfers go to online players only (server id or citizen id), because ai-core keeps money in memory for online characters.
- The screen gets one snapshot on open; personal balance and cash follow ai-core's player data deltas, a society balance goes as a delta to every open screen that shows that account (each boss of the job) after any change through ai-banking (screen actions and the society exports). ATMs only withdraw and transfer.
- ATMs are map props the server cannot see: the client sends the ATM's position on open, the server refuses a player more than 3 m from it and checks the same point on every ATM action (a branch re-checks the branch). A modified client can still name a made-up point, so (owner decision) ATMs get their own panel limits instead of more trust in that point: `atmLimit` per withdrawal or transfer (default 5,000) and `atmDailyLimit` per character over 24 h (default 20,000, `server/screen/atmAllowance.ts`: by character id in memory, a window opens with the first ATM action; a restart of ai-banking clears every count). Branches keep the strict branch check and have no limit.
- Branch blips: per branch `blip` switch plus a `blipStyle` (panel `blip` widget).
- Paycheck office (ai-core panel `paycheck.mode` "office": salary waits in metadata `paycheck`): taken out only through ai-core's `GetPaycheckBalance` / `WithdrawPaycheck` (`server/paycheck.ts`; ai-core's error keys mapped to this resource's `PAYCHECK_ERR_*`). Two places: a Paycheck tab on the branch screen (switch `paycheckAtBranches`, default on; shown for the whole visit when ai-core's `GetPaycheckMode()` is "office" at open, even at 0, and in account mode only while salary is left from office mode) and NPC offices from the `offices` records file (switch `paycheckOffices`, default off; they exist only while it is on and ai-core is in office mode: the client follows ai-core's GlobalState `CORE.paycheckModeStateKey`, the server refuses office withdrawals in account mode; a change of either rebuilds every office). The shipped office is the Pacific Standard clerk; the Fleeca offices of the Qbox reference stand on the branch counters, where the branch tab already pays out. The snapshot carries the balance (`null` = not offered: ATM, switch off, account mode with nothing left); deltas come from ai-core's `metadata` player data (paycheck tick, withdrawal), no push of its own. The office menu reads the balance once when it opens.
- Wanted sightings: every opened screen calls ai-police's `ReportSighting(source, "bank" | "atm")` once (`server/sightings.ts`, switch `reportSightings`, default on), only while ai-police runs (`optionalExport("ai-police")`).

## Contracts

- Callbacks and shapes: `resource/common/bank.ts` (branches and offices share the `Bank` place shape, `readBank` / `readOffice`; panel place tabs from `server/placeSchema.ts`). Exports `GetAccountBalance(job)`, `AddMoney(job, amount, reason)`, `RemoveMoney(job, amount, reason)` (also as `qb-banking`; `Renewed-Banking` `getAccountMoney` / `addAccountMoney` / `removeAccountMoney`).
- Reads tables `ai_core_accounts`, `ai_core_transactions` (needs its own `add_convar_permission` line).

## Entry points

- Server: `resource/server/index.ts` only imports the features: the screen `server/screen/` (open, history, actions and close in `index.ts`; open sessions and society balance deltas `sessions.ts`, accounts `accounts.ts`, deposit / withdraw / transfer `action.ts`, ledger reads `history.ts`), society exports `server/society.ts`; panel views `server/panel.ts`, schema `server/schema.ts`.
- Client: paycheck office points and their menu (lib `menu` + `input`) `client/offices.ts`; branch points and the ATM model point `client/points.ts` (lib `RecordObjects`: an edited branch rebuilds only its point; the ATM model point follows `settings.atmModels`), the screen and its NUI bridge `client/screen/`, panel mirror `client/world.ts`.
- NUI (tgiann-bank look): shell and labelled header tabs `web/src/App.tsx`, card / accounts / activity (in and out of the loaded history page) / form / paycheck form / history in `web/src/features/bank/`; preview `bun run webdev` (`?atm=1`).
