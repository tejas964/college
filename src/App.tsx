import React, { useEffect, useMemo, useReducer, useState } from 'react'
import { loadState, reducer, saveState, AppState, Action } from './state'
import { todayISO } from './engine/bills'
import { makeT } from './i18n'
import { TodayScreen } from './screens/Today'
import { EarnScreen } from './screens/Earn'
import { MoneyScreen } from './screens/Money'
import { PlanScreen } from './screens/Plan'
import { MeScreen } from './screens/Me'
import { ShiftCapsule } from './components/ShiftCapsule'

export type Tab = 'today' | 'earn' | 'money' | 'plan' | 'me'

export interface AppCtx {
  state: AppState
  dispatch: React.Dispatch<Action>
  t: (key: string, vars?: Record<string, string | number>) => string
  today: string
}

export const Ctx = React.createContext<AppCtx | null>(null)

export function useApp() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error('no ctx')
  return c
}

export function App() {
  const today = todayISO()
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(today))
  const [tab, setTab] = useState<Tab>('today')
  const t = useMemo(() => makeT(state.lang), [state.lang])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])
  useEffect(() => {
    document.documentElement.lang = state.lang
  }, [state.lang])

  const ctx: AppCtx = { state, dispatch, t, today }
  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: t('tab.today') },
    { id: 'earn', label: t('tab.earn') },
    { id: 'money', label: t('tab.money') },
    { id: 'plan', label: t('tab.plan') },
    { id: 'me', label: t('tab.me') },
  ]

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <div className="bg-drift" aria-hidden />
        <ShiftCapsule />
        <main className="content">
          {tab === 'today' && <TodayScreen />}
          {tab === 'earn' && <EarnScreen />}
          {tab === 'money' && <MoneyScreen />}
          {tab === 'plan' && <PlanScreen />}
          {tab === 'me' && <MeScreen />}
        </main>
        <nav className="tab-bar glass" role="tablist" aria-label="Main">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              className={tab === tb.id ? 'tab active' : 'tab'}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </nav>
      </div>
    </Ctx.Provider>
  )
}
