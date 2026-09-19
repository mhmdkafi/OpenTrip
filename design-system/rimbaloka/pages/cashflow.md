# Cashflow

Revision: 15 September 2026, following the user's request to redesign and refactor the cashflow frontend.

- Keep the shared Rimbaloka sidebar and forest/sage/sand palette.
- Present three primary metrics: net cash profit, income, expenses. Give the net result a forest background. Show the previous-period comparison without inventing percentages when the baseline is zero.
- Place the interactive cash chart beside expense allocation. Opening/closing recorded balances sit in the chart footer, not in another large summary panel.
- Preserve month → week → trip navigation and the selected week when opening transactions.
- Trip detail opens on Transactions. Participant payments and expense allocation are separate, keyboard-accessible tabs. Expense actions remain inside trip detail.
- Show desktop transactions as a ledger with signed amounts and a running balance. At phone widths, use transaction cards with visible amounts, categories, balances, and edit/delete actions.
- Monthly/yearly overviews show cumulative net-profit lines only: current period in solid forest, previous period in dashed earth brown. Monthly compares aligned calendar days; yearly compares Jan–Dec. The chart shows how net profit develops across each period, including drops after expenses. Negative values remain below zero; nonexistent dates are gaps. Period totals sit above the chart. A native select supports keyboard/touch inspection, and a table exposes both running values and their difference. Empty periods show an explicit empty state.
- Weekly overview and all trip detail views have no profit chart. Recorded balances remain available in the weekly view.
- CSS is scoped to `.cashflow-workspace` in `src/styles/cashflow.css`; other sections retain their layout.

Components: `finance.tsx` manages selection and mutations; `finance-summary.tsx`, `cash-graph.tsx`, `finance-recap.tsx`, `finance-ledger.tsx`, and `finance-breakdown.tsx` own individual views. Existing domain period and cash calculations remain shared.
