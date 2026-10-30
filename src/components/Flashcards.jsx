import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { shuffle } from '../lib/hooks.js'
import { SYSTEM_ICONS, ChevronLeft, ChevronRight, ShuffleIcon, CheckIcon, ResetIcon, RotateIcon } from './icons.jsx'

const KINDS = ['function', 'latin', 'location']

/** Tarjetas de estudio con giro 3D. */
export function Flashcards() {
  const { t, content } = useI18n()
  const [system, setSystem] = useState('all')
  const [seed, setSeed] = useState(0)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(() => new Set())

  const deck = useMemo(() => {
    const entries = Object.entries(content.structures).filter(([, s]) => system === 'all' || s.sistemas.includes(system))
    const base = entries.map(([id, s], k) => ({ id, s, kind: KINDS[k % KINDS.length] }))
    return seed ? shuffle(base) : base
  }, [content, system, seed])

  useEffect(() => {
    setI(0)
    setFlipped(false)
  }, [deck])

  const card = deck[i]
  const go = (d) => {
    setFlipped(false)
    setTimeout(() => setI((x) => (x + d + deck.length) % deck.length), flipped ? 180 : 0)
  }
  const mark = (ok) => {
    setKnown((k) => {
      const n = new Set(k)
      if (ok) n.add(card.id)
      else n.delete(card.id)
      return n
    })
    go(1)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!document.getElementById('flashcards')?.contains(document.activeElement)) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card) return null
  const Icon = SYSTEM_ICONS[card.s.sistemas[0]]
  const knownInDeck = deck.filter((c) => known.has(c.id)).length
  const front =
    card.kind === 'function' ? card.s.funcion : card.kind === 'latin' ? card.s.latin : card.s.ubicacion

  return (
    <div id="flashcards" className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('study.deck')}>
          <button className="chip" aria-pressed={system === 'all'} onClick={() => setSystem('all')}>
            {t('study.allSystems')}
          </button>
          {content.systems.map((s) => (
            <button key={s.id} className="chip" aria-pressed={system === s.id} onClick={() => setSystem(s.id)}>
              {t(`systemNames.${s.id}`)}
            </button>
          ))}
        </div>

        <div className={`flip h-[22rem] sm:h-[20rem] ${flipped ? 'is-flipped' : ''}`}>
          <button
            type="button"
            className="flip-inner block h-full w-full text-left"
            onClick={() => setFlipped((f) => !f)}
            aria-label={`${t('study.cardOf', { i: i + 1, n: deck.length })}. ${t('study.flip')}`}
            aria-live="polite"
          >
            <div className="flip-face card flex flex-col p-6 sm:p-8 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-xs text-sky-ink">
                  {Icon && <Icon size={14} />} {t(`systemNames.${card.s.sistemas[0]}`)}
                </span>
                <span className="mono text-[11px] text-ink-faint">{t('study.cardOf', { i: i + 1, n: deck.length })}</span>
              </div>
              <p className="mt-6 mono text-[11px] uppercase tracking-[0.16em] text-lavender-ink">{t(`study.question.${card.kind}`)}</p>
              <p className={`mt-3 flex-1 text-ink ${card.kind === 'latin' ? 'text-3xl sm:text-4xl font-semibold italic' : 'text-lg sm:text-xl leading-relaxed'}`}>{front}</p>
              <span className="mt-4 inline-flex items-center gap-2 self-end text-xs text-ink-faint">
                <RotateIcon size={14} /> {t('study.flip')}
              </span>
            </div>
            <div className="flip-face flip-back card flex flex-col overflow-hidden p-6 sm:p-8" style={{ background: 'linear-gradient(140deg, #F4F0FF, #FFFFFF 60%, #FFF2F5)' }}>
              <span className="mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{card.s.latin}</span>
              <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-gradient">{card.s.nombre}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {card.kind === 'function' ? card.s.ubicacion : card.s.funcion}
              </p>
              <p className="mt-auto rounded-2xl bg-white/80 px-3 py-2 text-xs text-ink-soft">✦ {card.s.datos[0]}</p>
            </div>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="icon-btn border border-line bg-white" onClick={() => go(-1)} aria-label={t('card.prev')}>
            <ChevronLeft size={18} />
          </button>
          <button className="icon-btn border border-line bg-white" onClick={() => go(1)} aria-label={t('card.next')}>
            <ChevronRight size={18} />
          </button>
          <div className="ml-auto flex gap-2">
            <button className="btn btn-ghost !py-2.5 text-sm" onClick={() => mark(false)}>
              <ResetIcon size={16} /> {t('study.review')}
            </button>
            <button className="btn btn-primary !py-2.5 text-sm" onClick={() => mark(true)}>
              <CheckIcon size={16} /> {t('study.know')}
            </button>
          </div>
        </div>
      </div>

      <aside className="card flex flex-col gap-4 p-5">
        <div>
          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-ink">{t('study.known')}</span>
            <span className="mono text-sm text-lavender-ink">
              {knownInDeck}/{deck.length}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-sky via-lavender to-coral transition-all duration-500" style={{ width: `${(knownInDeck / deck.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            {t('study.toReview')}: {deck.length - knownInDeck}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1 !py-2 text-sm" onClick={() => setSeed((s) => s + 1)}>
            <ShuffleIcon size={16} /> {t('study.shuffle')}
          </button>
          <button className="btn btn-ghost flex-1 !py-2 text-sm" onClick={() => setKnown(new Set())}>
            <ResetIcon size={16} /> {t('study.restart')}
          </button>
        </div>
        <ol className="scroll-thin -mx-1 max-h-48 overflow-y-auto px-1 lg:max-h-none lg:flex-1" aria-label={t('study.deck')}>
          {deck.map((c, k) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setFlipped(false)
                  setI(k)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] ${k === i ? 'bg-lavender-soft text-lavender-ink' : 'text-ink-soft hover:bg-bone'}`}
              >
                <span className={`grid h-4 w-4 place-items-center rounded-full border ${known.has(c.id) ? 'border-transparent bg-lavender text-white' : 'border-line-strong'}`}>
                  {known.has(c.id) && <CheckIcon size={11} />}
                </span>
                {c.s.nombre}
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
