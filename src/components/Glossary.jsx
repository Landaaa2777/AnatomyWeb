import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { SectionHeader } from './Section.jsx'
import { SearchIcon, BookIcon } from './icons.jsx'

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const CAT_COLOR = {
  Orientación: '#8EC9FF',
  Movimiento: '#B9A6FF',
  'Huesos y articulaciones': '#8EB4E8',
  Músculos: '#FF8FA3',
  Circulación: '#F2647F',
  'Sistema nervioso': '#9C86F5',
  General: '#F5A08A',
}

function Highlight({ text, q }) {
  if (!q) return text
  const i = norm(text).indexOf(norm(q))
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-lavender-soft px-0.5 text-lavender-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export function Glossary() {
  const { t, content } = useI18n()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const cats = useMemo(() => [...new Set(content.glossary.map((g) => g.categoria))], [content])
  const items = useMemo(() => {
    const nq = norm(q.trim())
    return content.glossary
      .filter((g) => (cat === 'all' || g.categoria === cat) && (!nq || norm(g.termino).includes(nq) || norm(g.definicion).includes(nq)))
      .sort((a, b) => a.termino.localeCompare(b.termino, 'es'))
  }, [q, cat, content])

  return (
    <section id="glosario" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t('glossary.eyebrow')} title={t('glossary.title')} subtitle={t('glossary.subtitle')} />
          <label className="flex w-full max-w-sm items-center gap-2 rounded-2xl glass-strong px-3.5 py-2.5">
            <SearchIcon size={18} className="text-ink-faint" />
            <span className="sr-only">{t('glossary.search')}</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('glossary.search')}
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Categorías">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            {t('glossary.all')}
          </button>
          {cats.map((c) => (
            <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[c] || '#B9A6FF' }} />
              {c}
            </button>
          ))}
          <span className="ml-auto mono text-[11px] text-ink-faint" aria-live="polite">
            {t('glossary.count', { n: items.length })}
          </span>
        </div>

        <motion.ul layout className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          <AnimatePresence>
            {items.map((g) => (
              <motion.li
                layout
                key={g.termino}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="group rounded-3xl border border-line bg-white/80 p-5 transition-shadow hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-ink">
                    <Highlight text={g.termino} q={q.trim()} />
                  </h3>
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CAT_COLOR[g.categoria] || '#B9A6FF' }} title={g.categoria} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  <Highlight text={g.definicion} q={q.trim()} />
                </p>
                <p className="mt-3 mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{g.categoria}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
        {items.length === 0 && (
          <p className="mt-10 flex items-center justify-center gap-2 text-ink-faint">
            <BookIcon size={18} /> {t('glossary.empty')}
          </p>
        )}
      </div>
    </section>
  )
}
