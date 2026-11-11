import en from './locales/en.json'
import kn from './locales/kn.json'
import hi from './locales/hi.json'
import type { AppState } from './state'

export type Lang = 'en' | 'kn' | 'hi'
const dicts: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  kn: kn as Record<string, string>,
  hi: hi as Record<string, string>,
}

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const d = dicts[lang] || dicts.en
  let s = d[key] ?? dicts.en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}

export function makeT(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>) => t(lang, key, vars)
}

export function langFromState(state: AppState): Lang {
  return state.lang
}
