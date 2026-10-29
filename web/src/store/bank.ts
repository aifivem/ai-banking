import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import type { BankSnapshot, HistoryPage, Transaction } from "../../../resource/common/bank";

interface BankState {
  snapshot: BankSnapshot | null;
  selected: string;
  history: Record<string, { rows: Transaction[]; more: boolean; loading: boolean }>;
}

const initialState: BankState = { snapshot: null, selected: "personal", history: {} };

/** The bank screen: the open snapshot, then cash / balance deltas and history pages. */
const bank = createSlice({
  name: "bank",
  initialState,
  reducers: {
    opened(state, a: PayloadAction<BankSnapshot>) {
      state.snapshot = a.payload;
      state.selected = a.payload.accounts[0]?.key ?? "personal";
      state.history = {};
    },
    closed(state) {
      state.snapshot = null;
    },
    selected(state, a: PayloadAction<string>) {
      state.selected = a.payload;
    },
    cashSet(state, a: PayloadAction<number>) {
      if (state.snapshot) state.snapshot.cash = a.payload;
    },
    balanceSet(state, a: PayloadAction<{ account: string; balance: number }>) {
      const account = state.snapshot?.accounts.find((x) => x.key === a.payload.account);
      if (account) account.balance = a.payload.balance;
      // A new transaction exists: the first page is reloaded when the account is shown again.
      delete state.history[a.payload.account];
    },
    historyLoading(state, a: PayloadAction<string>) {
      const h = (state.history[a.payload] ??= { rows: [], more: true, loading: false });
      h.loading = true;
    },
    historyPage(state, a: PayloadAction<HistoryPage>) {
      const h = (state.history[a.payload.account] ??= { rows: [], more: true, loading: false });
      const known = new Set(h.rows.map((r) => r.id));
      h.rows.push(...a.payload.rows.filter((r) => !known.has(r.id)));
      h.more = a.payload.more;
      h.loading = false;
    },
  },
});

export const { opened, closed, selected, cashSet, balanceSet, historyLoading, historyPage } = bank.actions;
export const store = configureStore({ reducer: { bank: bank.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = useSelector.withTypes<RootState>();
