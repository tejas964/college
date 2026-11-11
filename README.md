# GigWallet v2

Money-safety app for gig workers in India (delivery riders, cab and auto drivers, freelancers). Accurate paise-based engine, one-handed mobile-first UI, usable in English, Kannada and Hindi. Frontend-only (Vite + React 18 + TypeScript strict), data stored locally.

## How to run

```bash
npm install
npm run dev       # start Vite dev server
npm run build     # tsc --noEmit && vite build
npm run test      # vitest run (node environment)
npm run typecheck # tsc --noEmit
```

## What's built

- **Engine (pure, no React/DOM/I/O, all money in integer paise):** `money` (toPaise/toRupees, Indian grouping `formatINR`, `parseRupees`), `bills` (UTC date arithmetic, daily need/work-days, bills due window, free cash, runway), `trips` (cost breakdown, ₹/hour, median, trip verdict with 30-trip learning window), `incentives` (slab progress, pace/projected/realistic, extra cost & net gain), `payouts` (reconciliation, flag when gap > ₹50 and > 2%), `loan` (PV/rate by bisection, effective/nominal annual, EMI load bands), `lean` (weekly nets of worked weeks, percentile, lean-week plan, needs 4 weeks), `ledger` (dedupe, digit-masking, posted-only bank totals; bank entries never change balance), `tax` (config-driven slabs/87A/cess for new & old regimes, best regime, presumptive 6% where eligible, TDS still-to-set/refund, annualisation), `ingest/sms` (amount/direction parse, confidence/review, FNV-1a dedupe key, masked note), `summary` (today/week/tax summaries; numbers shown in UI come from engine/summary).
- **State:** versioned `AppState` in localStorage key `gigwallet.v1`, reducer actions (trips, set-aside capped to bill, shift start/end logging minutes, bank entries with posted/review/rejected status only, incentives/payouts upsert/remove, reset), `createSeed(today)` sample data on first run, resilient load merging defaults for v1.
- **UI:** bottom tab bar (Today, Earn, Money, Plan, Me), fixed shift capsule (600ms hold to start, tap to end, live timer), Today gauge & tiles (earned/to go/₹/h/runway), bill tanks, free cash, insight; Earn weekly/breakdown/today trips; Money balance, bills set-aside, SMS paste/check & confirm queue, trip form with live verdict, incentives & payout check with dispute note; Plan lean-week, loan cost & EMI load, vehicle service, insurance/schemes checklist; Me language (EN/KN/HI) & theme (Night/Sunlight), settings, rates, tax card, income summary (print-only section), export JSON, reset. Night/Sunlight themes, glass capsule/tab bar, lite mode fallback, condensed tabular numerals, 48px targets.
- **Tests:** engine unit tests (money, bills, trips, incentives, payouts, loan, lean, ledger, tax, sms), state reducer, summary, and screen render tests (react-dom/server with sample data).

## Structure

```
src/
  engine/          # pure modules + tests (money,bills,trips,incentives,payouts,loan,lean,ledger,tax,summary)
    ingest/sms.ts
  config/tax/IN_2025-26.json
  state.ts         # AppState, reducer, seed, load/save
  i18n.ts
  locales/{en,kn,hi}.json
  components/      # ShiftCapsule, Gauge
  screens/         # Today, Earn, Money, Plan, Me (+ render tests)
  App.tsx, main.tsx, styles.css
```

## Known gaps (stated honestly)

1. **Tax rates are unverified** and must be checked against incometax.gov.in and the current Finance Act before real use.
2. **Tax model is simplified:** no marginal relief, surcharge, deductions, advance-tax interest, or full presumptive eligibility rules.
3. **New screens are English only;** Kannada and Hindi fall back to English for newer keys until translated and reviewed.
4. **No bank connection** (Account Aggregator, bank feeds, platform APIs). Bank data comes from pasted SMS only.
5. **Voice entry not built.** Fuel price is manual. Insurance and schemes are a checklist only.
6. **Balance is set by hand** and bank entries never change it (entries are evidence for verification/income summary).
7. **Local storage only;** no sync, backup or login.
8. **Not tested on real devices;** render tests run in Node.
9. **Sample data on first run;** reset available.

## Before real users

- Verify and update tax config/rules against official sources; have a CA review; add missing tax cases.
- Complete and professionally review Kannada/Hindi translations for all keys.
- Test on target mid-range Android devices, browsers, and accessibility (screen readers, contrast, touch).
- Add data backup/export guidance and migration/versioning for future schema changes.
- Security/privacy review for on-device data; consider encryption-at-rest options where supported.
- Validate SMS parsing against real bank/UPI message formats; handle more variants safely.
- Add error/empty states and QA for edge cases (large values, long usage, storage quota).
