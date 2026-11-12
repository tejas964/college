import { useEffect, useReducer, useState } from 'react'
import { isSampleState, loadState, reducer, saveState } from './state'
import { todayISO } from './engine/bills'
import { useT } from './i18n'
import { ShiftCapsule } from './components/ShiftCapsule'
import { TabBar } from './components/TabBar'
import type { Tab } from './components/TabBar'
import { TodayScreen } from './screens/TodayScreen'
import { EarnScreen } from './screens/EarnScreen'
import { MoneyScreen } from './screens/MoneyScreen'
import { PlanScreen } from './screens/PlanScreen'
import { MeScreen } from './screens/MeScreen'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [tab, setTab] = useState<Tab>('today')
  const t = useT(state.lang)
  const today = todayISO()

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = state.theme
    root.lang = state.lang
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', state.theme === 'night' ? '#0A0C10' : '#F4F6FA')
    }
  }, [state.theme, state.lang])

  useEffect(() => {
    const root = document.documentElement
    const nav = navigator as Navigator & { deviceMemory?: number }
    const memory = nav.deviceMemory ?? 8
    let supportsBackdrop = true
    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
      supportsBackdrop =
        CSS.supports('backdrop-filter', 'blur(1px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
    }
    root.dataset.lite = memory <= 3 || !supportsBackdrop ? 'true' : 'false'
  }, [])

  return (
    <div className="app-shell">
      <div className="bg-drift" aria-hidden="true" />
      <ShiftCapsule state={state} dispatch={dispatch} t={t} />
      <main className="main">
        {isSampleState(state) && <div className="sample-banner">{t('app.sample')}</div>}
        {tab === 'today' && <TodayScreen state={state} today={today} t={t} />}
        {tab === 'earn' && <EarnScreen state={state} today={today} t={t} />}
        {tab === 'money' && <MoneyScreen state={state} dispatch={dispatch} today={today} t={t} />}
        {tab === 'plan' && <PlanScreen state={state} dispatch={dispatch} today={today} t={t} />}
        {tab === 'me' && <MeScreen state={state} dispatch={dispatch} today={today} t={t} />}
      </main>
      <TabBar active={tab} onChange={setTab} t={t} />
    </div>
  )
}