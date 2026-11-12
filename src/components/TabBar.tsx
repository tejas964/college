import type { TFunction } from '../i18n'

export type Tab = 'today' | 'earn' | 'money' | 'plan' | 'me'

const tabs: Array<{ id: Tab; key: string }> = [
  { id: 'today', key: 'nav.today' },
  { id: 'earn', key: 'nav.earn' },
  { id: 'money', key: 'nav.money' },
  { id: 'plan', key: 'nav.plan' },
  { id: 'me', key: 'nav.me' },
]

export function TabBar({
  active,
  onChange,
  t,
}: {
  active: Tab
  onChange: (tab: Tab) => void
  t: TFunction
}) {
  return (
    <nav className="tab-bar glass" aria-label={t('nav.primary')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className="tab-dot" />
          <span>{t(tab.key)}</span>
        </button>
      ))}
    </nav>
  )
}