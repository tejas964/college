# GigWallet v2

A money-safety app for gig workers in India: delivery riders, cab and auto drivers, and freelancers. It runs entirely on the phone with no backend. It is designed to work one-handed on a mid-range Android phone and to be usable in English, Kannada and Hindi.

GigWallet is an estimate and planning tool, not a bank, a lender, a tax filing service or a certificate.

## Run it

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

```bash
npm test
npm run typecheck
npm run build
```

`npm test` runs Vitest in the Node environment. `npm run build` runs the TypeScript check and then the Vite production build.

## What is built

- **Money engine.** All money is an integer number of paise. Formatting uses Indian digit grouping (`1,25,000`), paise when requested, and a true minus sign for negatives.
- **Bills.** UTC-only date arithmetic, open amounts, daily need, bills due within a horizon, free cash after bill and emergency reserves, and runway days.
- **Trips.** Fuel, wear, platform fee and net breakdown, rate per hour, median, and a 30-trip learning model for whether a trip is worth taking.
- **Incentives.** Window counting, pace, projected completion, realistic/expired/complete states, extra cost and net gain.
- **Payout checks.** Expected fares excluding tips plus incentive bonus, gap, and a flag only when the gap is over ₹50 and over 2% of expected.
- **Loans.** Present value, bisection-solved monthly rate, annual effective rate, nominal rate, total repayable, interest, and EMI load band.
- **Lean planning.** Worked-week buckets, 20th percentile low week, gap to fixed weekly costs, and hours needed at the current per-hour rate.
- **Ledger.** Bank SMS entries, deduplication, digit masking, and bank totals for posted entries only.
- **Tax estimate.** New and old regime slabs, 87A rebate, 4% cess, TDS/refund, presumptive 6% deemed income, and annualisation from worked days.
- **State.** A versioned `localStorage` state under `gigwallet.v1`, a reducer, and sample data for the first run.
- **Screens.** Today, Earn, Money, Plan and Me, with a fixed glass shift capsule and a bottom glass tab bar.
- **Themes.** Night (default) and Sunlight, plus a lite mode for low-memory devices or missing backdrop-filter support.

## Structure

```
src/
  engine/          pure money and date maths, no React, DOM or I/O
    money.ts
    bills.ts
    trips.ts
    incentives.ts
    payouts.ts
    loan.ts
    lean.ts
    ledger.ts
    tax.ts
  config/tax/IN_2025-26.json
  ingest/sms.ts    bank SMS parser and FNV-1a dedupe key
  state.ts         AppState, reducer, seed, load/save
  summary.ts       Today, week, tax and income summaries
  locales/         en.json, kn.json, hi.json
  components/      ShiftCapsule, TabBar
  screens/         Today, Earn, Money, Plan, Me
  ui.tsx           small shared presentational pieces
  Gauge.tsx        circular gauge
  App.tsx          single app shell and tab routing
  styles.css       tokens, themes, glass, print styles
```

## Accuracy rules

- Money is stored and summed only as integer paise. The UI never does money arithmetic itself; it calls pure functions in `src/engine/` or `src/summary.ts`.
- Dates are ISO `YYYY-MM-DD` strings and all day arithmetic is UTC.
- Division by zero returns a defined result (0, or a "not enough data" state), never `NaN` or `Infinity` on screen.
- Engine modules have no React, no DOM and no runtime I/O.
- Bank entries never change the balance. The balance is set by hand; entries are evidence for verification and the income summary.
- Account numbers are never stored. SMS notes are masked before they are saved.

## Sample data

The first run seeds seven days of sample trips, one weekend bonus slab, four bills and a hand-set balance. Trip and bill IDs start with `sample-`, and the app shows a sample banner while the state is untouched sample data. Reset to sample data is available on the Me screen.

## Known gaps

1. **Tax rates are unverified.** The JSON config is marked UNVERIFIED. Check it against [incometax.gov.in](https://www.incometax.gov.in/) and the current Finance Act before any real use.
2. **The tax model is simplified.** It does not model marginal relief, surcharge, deductions, advance-tax interest, or the full presumptive eligibility rules.
3. **Translations are incomplete.** Hindi covers most screens. Kannada currently covers navigation and a few core labels; newer and remaining keys fall back to English until translated and reviewed. New screens are English only in some places.
4. **No bank connection.** There is no Account Aggregator, bank feed or platform API. Bank data comes only from pasted SMS and manual entries.
5. **No voice entry.** Fuel price is manual. Insurance and schemes are a text checklist only.
6. **Balance is set by hand.** Bank entries never change it.
7. **Local storage only.** There is no sync, backup or login.
8. **Not tested on real devices.** Render tests run in Node with `react-dom/server`.
9. **Sample data on first run.** Reset is available, and it is not a real person's data.

## Before real users

- Verify the tax config against the current Finance Act and incometax.gov.in, including marginal relief and surcharge.
- Replace the tax config's `status` and `ruleVersion` with reviewed values.
- Review every Kannada and Hindi string with a native speaker, and finish the English-only keys.
- Test on a real mid-range Android phone, including one-handed use, notches, reduced motion, and lite mode.
- Add a real backup/export/restore flow if users will keep data for more than one device.
- Add a privacy review for SMS notes, dedupe keys and exported JSON.
- Decide how to handle app updates that change the state shape; `loadState` merges defaults for version 1 only.
- Do not present any estimate as a tax filing, loan approval or lender recommendation.