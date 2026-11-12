import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createSeed } from './state'
import type { Action } from './state'
import type { Dispatch, ReactElement } from 'react'
import { translate } from './i18n'
import type { TFunction } from './i18n'
import { ShiftCapsule } from './components/ShiftCapsule'
import { TodayScreen } from './screens/TodayScreen'
import { EarnScreen } from './screens/EarnScreen'
import { MoneyScreen } from './screens/MoneyScreen'
import { PlanScreen } from './screens/PlanScreen'
import { MeScreen } from './screens/MeScreen'
import App from './App'

const today = '2026-01-01'
const t: TFunction = (key, vars) => translate('en', key, vars)
const state = createSeed(today)

const dispatch = (() => undefined) as unknown as Dispatch<Action>

function html(element: ReactElement): string {
  return renderToStaticMarkup(element)
}

describe('screens', () => {
  it('renders the Today screen with gauge, runway and free cash', () => {
    const markup = html(<TodayScreen state={state} today={today} t={t} />)
    expect(markup).toContain('of target')
    expect(markup).toContain('Free cash')
    expect(markup).toContain('Runway')
    expect(markup).toContain('Bills')
    expect(markup).not.toContain('NaN')
    expect(markup).not.toContain('Infinity')
  })

  it('renders the Earn screen with week and breakdown', () => {
    const markup = html(<EarnScreen state={state} today={today} t={t} />)
    expect(markup).toContain('This week')
    expect(markup).toContain('Breakdown')
    expect(markup).toContain("Today&#x27;s trips")
    expect(markup).not.toContain('NaN')
  })

  it('renders the Money screen with SMS, incentives and payouts', () => {
    const payoutState = {
      ...state,
      payouts: [
        {
          id: 'payout-test',
          platform: 'Main',
          from: '2025-12-01',
          to: '2025-12-31',
          received: 50_000,
          status: 'open' as const,
        },
      ],
    }
    const markup = html(
      <MoneyScreen
        state={payoutState}
        dispatch={dispatch}
        today={today}
        t={t}
      />,
    )
    expect(markup).toContain('Check a bank SMS')
    expect(markup).toContain('To confirm')
    expect(markup).toContain('Log a trip')
    expect(markup).toContain('Incentives')
    expect(markup).toContain('Payout check')
    expect(markup).toContain('Expected')
    expect(markup).toContain('Copy dispute note')
    expect(markup).not.toContain('NaN')
    expect(markup).not.toContain('Infinity')
  })

  it('renders the Plan screen with lean week, loan and service', () => {
    const markup = html(
      <PlanScreen state={state} dispatch={dispatch} today={today} t={t} />,
    )
    expect(markup).toContain('Lean week')
    expect(markup).toContain('Loan cost')
    expect(markup).toContain('Effective yearly rate')
    expect(markup).toContain('Vehicle service')
    expect(markup).toContain('Insurance and schemes')
    expect(markup).not.toContain('NaN')
    expect(markup).not.toContain('Infinity')
  })

  it('renders the Me screen with tax, income summary and export', () => {
    const markup = html(
      <MeScreen state={state} dispatch={dispatch} today={today} t={t} />,
    )
    expect(markup).toContain('Tax estimate')
    expect(markup).toContain('Actual (net income)')
    expect(markup).toContain('Income summary')
    expect(markup).toContain('Export data')
    expect(markup).toContain('Print')
    expect(markup).toContain('UNVERIFIED')
    expect(markup).not.toContain('NaN')
    expect(markup).not.toContain('Infinity')
  })

  it('renders both shift capsule states', () => {
    const off = html(<ShiftCapsule state={state} dispatch={dispatch} t={t} />)
    expect(off).toContain('Off shift')
    expect(off).toContain('Hold to start')

    const onState = { ...state, shiftStartedAt: Date.now() }
    const on = html(<ShiftCapsule state={onState} dispatch={dispatch} t={t} />)
    expect(on).toContain('On shift')
    expect(on).toContain('Tap to end')
  })
})
describe('app shell', () => {
  it('renders the app with the Today screen and shift capsule', () => {
    const markup = html(<App />)
    expect(markup).toContain('Today')
    expect(markup).toContain('Hold to start')
    expect(markup).toContain('Free cash')
    expect(markup).toContain('Sample data')
  })
})
