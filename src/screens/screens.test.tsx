import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Ctx, AppCtx } from '../App'
import { createSeed, reducer } from '../state'
import { makeT } from '../i18n'
import { TodayScreen } from './Today'
import { EarnScreen } from './Earn'
import { MoneyScreen } from './Money'
import { PlanScreen } from './Plan'
import { MeScreen } from './Me'
import { ShiftCapsule } from '../components/ShiftCapsule'

const today = '2026-11-11'

function renderWithCtx(node: React.ReactElement, lang: 'en' | 'kn' | 'hi' = 'en') {
  const state = createSeed(today)
  const ctx: AppCtx = {
    state: { ...state, lang },
    dispatch: () => {},
    t: makeT(lang),
    today,
  }
  return renderToString(<Ctx.Provider value={ctx}>{node}</Ctx.Provider>)
}

describe('screens render', () => {
  it('renders Today with gauge/runway and key tiles', () => {
    const html = renderWithCtx(<TodayScreen />)
    expect(html).toContain('of target')
    expect(html).toContain('Runway')
    expect(html).toContain('days')
    expect(html).toContain('Bill tanks')
    expect(html).toContain('Free cash')
  })

  it('renders Earn with weekly net and breakdown', () => {
    const html = renderWithCtx(<EarnScreen />)
    expect(html).toContain('Weekly net')
    expect(html).toContain('Breakdown')
    expect(html).toContain('Today&#x27;s trips') // apostrophe encoded or text
  })

  it('renders Money with SMS, incentives, payouts, trip form', () => {
    const html = renderWithCtx(<MoneyScreen />)
    expect(html).toContain('Bank SMS')
    expect(html).toContain('Check')
    expect(html).toContain('Log trip')
    expect(html).toContain('Incentives')
    expect(html).toContain('Payout check')
    expect(html).toContain('Weekend bonus')
  })

  it('renders Plan with lean-week, loan, service', () => {
    const html = renderWithCtx(<PlanScreen />)
    expect(html).toContain('Lean week')
    expect(html).toContain('Loan cost')
    expect(html).toContain('Vehicle service')
    expect(html).toContain('Insurance and schemes')
  })

  it('renders Me with income summary, export, tax', () => {
    const html = renderWithCtx(<MeScreen />)
    expect(html).toContain('Income summary')
    expect(html).toContain('Export data')
    expect(html).toContain('Tax')
    expect(html).toContain('Not a certificate')
  })

  it('renders shift capsule states', () => {
    const off = renderWithCtx(<ShiftCapsule />)
    expect(off).toContain('Off shift')
    expect(off).toContain('Hold to start shift')

    const state = createSeed(today)
    state.shiftStartedAt = Date.now() - 5 * 60000
    const ctx: AppCtx = { state, dispatch: () => {}, t: makeT('en'), today }
    const on = renderToString(<Ctx.Provider value={ctx}><ShiftCapsule /></Ctx.Provider>)
    expect(on).toContain('On shift')
    expect(on).toContain('Tap to end shift')
  })
})
