import { useCallback, useMemo } from 'react'
import en from './locales/en.json'
import kn from './locales/kn.json'
import hi from './locales/hi.json'
import type { Lang } from './state'

export type TFunction = (key: string, vars?: Record<string, string | number>) => string

const dictionaries: Record<Lang, Record<string, string>> = {
  en,
  kn,
  hi,
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]),
  )
}

export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const value = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key
  return interpolate(value, vars)
}

export function useT(lang: Lang): TFunction {
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  )
}

export function useLanguageNames(): Record<Lang, string> {
  return useMemo(
    () => ({
      en: 'English',
      kn: 'ಕನ್ನಡ',
      hi: 'हिंदी',
    }),
    [],
  )
}