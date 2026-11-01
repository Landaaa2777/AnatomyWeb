/**
 * Internacionalización mínima.
 *  - Textos de interfaz: src/i18n/<idioma>.js
 *  - Contenido anatómico: src/content/<idioma>/
 * Para añadir un idioma basta con registrar ambos en LOCALES.
 */
import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import es from './es.js'
import structuresEs from '../content/es/structures.js'
import systemsEs from '../content/es/systems.js'
import glossaryEs from '../content/es/glossary.js'
import questionsEs from '../content/es/questions.js'

export const LOCALES = {
  es: { ui: es, content: { structures: structuresEs, systems: systemsEs, glossary: glossaryEs, questions: questionsEs } },
}

const I18nContext = createContext(null)

function lookup(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

export function I18nProvider({ children, initial = 'es' }) {
  const [locale, setLocale] = useState(LOCALES[initial] ? initial : 'es')
  const pack = LOCALES[locale]

  useEffect(() => {
    document.documentElement.lang = pack.ui.meta.lang
  }, [pack])

  const t = useCallback(
    (key, vars) => {
      let s = lookup(pack.ui, key) ?? lookup(LOCALES.es.ui, key) ?? key
      if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
      return s
    },
    [pack],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      content: pack.content,
      nameOf: (id) => pack.content.structures[id]?.nombre ?? id,
      locales: Object.entries(LOCALES).map(([k, v]) => ({ id: k, name: v.ui.meta.name })),
    }),
    [locale, t, pack],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
