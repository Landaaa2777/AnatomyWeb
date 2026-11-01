/**
 * Tests de anatomía de opción múltiple: configuración, realización (modo práctica o examen con tiempo)
 * y resultados con nota, desglose por tema y revisión de cada respuesta.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { useExplorer } from '../state/explorer.js'
import { useModel } from '../anatomy/loader.js'
import { storage } from '../lib/hooks.js'
import { buildQuestionBank, makeTest } from '../lib/questionBank.js'
import { SectionHeader } from './Section.jsx'
import { SYSTEM_ICONS, CheckIcon, CloseIcon, ChevronLeft, ChevronRight, PlayIcon, ResetIcon, ArrowRight, BookIcon, FocusIcon } from './icons.jsx'

const LETTERS = ['A', 'B', 'C', 'D']
const COUNTS = [10, 20, 30, 50]
const SECONDS_PER_Q = 45
const HISTORY_KEY = 'anatomia3d.historialTests'

/** "Sistema óseo" → "Óseo" (etiquetas compactas). */
const short = (name) => {
  const n = name.replace(/^Sistema /, '')
  return n.charAt(0).toUpperCase() + n.slice(1)
}
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const fmtGrade = (g) => g.toFixed(1).replace('.', ',')
const gradeKey = (g) => (g >= 9 ? 'sobresaliente' : g >= 7 ? 'notable' : g >= 6 ? 'bien' : g >= 5 ? 'aprobado' : 'suspenso')
const GRADE_COLOR = { sobresaliente: '#5E45C9', notable: '#2A68A8', bien: '#2F8F6B', aprobado: '#B7791F', suspenso: '#B8385A' }

function LevelDots({ level }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= level ? 'bg-lavender-ink' : 'bg-line-strong'}`} />
      ))}
    </span>
  )
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-line bg-bone p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-xl px-2 py-2 text-sm tabular-nums transition-all ${value === v ? 'bg-white font-medium text-ink shadow-[0_4px_12px_-6px_rgba(43,52,69,0.35)]' : 'text-ink-soft hover:text-ink'}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function Exam() {
  const { t, content } = useI18n()
  const bank = useMemo(() => buildQuestionBank(content), [content])
  const [phase, setPhase] = useState('setup') // setup | play | results
  const [cfg, setCfg] = useState({ topic: 'all', level: 0, count: 20, mode: 'practice' })
  const [test, setTest] = useState([])
  const [answers, setAnswers] = useState({}) // índice → texto elegido
  const [flags, setFlags] = useState({})
  const [current, setCurrent] = useState(0)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [history, setHistory] = useState(() => storage.get(HISTORY_KEY, []))
  const sectionRef = useRef(null)

  const topics = useMemo(
    () => [['all', t('exam.all')], ...content.systems.map((s) => [s.id, short(s.nombre)]), ['general', t('exam.general')]],
    [content, t],
  )
  const topicName = (id) => (id === 'general' ? t('exam.general') : content.systems.find((s) => s.id === id)?.nombre ?? t('exam.all'))
  const available = bank.filter((q) => (cfg.topic === 'all' || q.system === cfg.topic) && (!cfg.level || q.level === cfg.level)).length
  const n = Math.min(cfg.count, available)
  const timeLimit = test.length * SECONDS_PER_Q

  const start = (ids = null) => {
    const tst = makeTest(bank, { ...cfg, ids })
    if (!tst.length) return
    setTest(tst)
    setAnswers({})
    setFlags({})
    setCurrent(0)
    setConfirming(false)
    setStartedAt(Date.now())
    setElapsed(0)
    setPhase('play')
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const finish = useCallback(() => {
    const secs = Math.round((Date.now() - startedAt) / 1000)
    setElapsed(secs)
    const hits = test.filter((q, i) => answers[i] === q.answer).length
    const entry = { date: Date.now(), hits, total: test.length, topic: cfg.topic, mode: cfg.mode, secs }
    const nh = [entry, ...history].slice(0, 6)
    setHistory(nh)
    storage.set(HISTORY_KEY, nh)
    setPhase('results')
    setConfirming(false)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [answers, test, startedAt, cfg, history])

  // reloj (modo examen: cuenta atrás con entrega automática)
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      const secs = (Date.now() - startedAt) / 1000
      setElapsed(secs)
      if (cfg.mode === 'exam' && secs >= timeLimit) finish()
    }, 500)
    return () => clearInterval(id)
  }, [phase, startedAt, cfg.mode, timeLimit, finish])

  const q = test[current]
  const chosen = answers[current]
  const locked = cfg.mode === 'practice' && chosen != null

  const choose = useCallback(
    (opt) => {
      if (phase !== 'play' || (cfg.mode === 'practice' && answers[current] != null)) return
      setAnswers((a) => ({ ...a, [current]: opt }))
    },
    [phase, cfg.mode, answers, current],
  )
  const go = (d) => setCurrent((c) => Math.max(0, Math.min(test.length - 1, c + d)))
  const next = () => {
    if (current < test.length - 1) go(1)
    else if (cfg.mode === 'practice') finish()
    else trySubmit()
  }
  const unanswered = test.length - Object.keys(answers).length
  const trySubmit = () => (unanswered > 0 ? setConfirming(true) : finish())

  // teclado: 1–4 / A–D para responder, Enter para continuar, flechas para navegar
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      const rect = sectionRef.current?.getBoundingClientRect()
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return
      const k = e.key.toLowerCase()
      const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? ['1', '2', '3', '4'].indexOf(k) : ['a', 'b', 'c', 'd'].indexOf(k)
      if (idx >= 0 && q?.shuffled[idx]) {
        e.preventDefault()
        choose(q.shuffled[idx])
      } else if (k === 'enter' && chosen != null) {
        e.preventDefault()
        next()
      } else if (k === 'arrowright' && cfg.mode === 'exam') go(1)
      else if (k === 'arrowleft' && cfg.mode === 'exam') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <section id="tests" ref={sectionRef} className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow={t('exam.eyebrow')} title={t('exam.title')} subtitle={t('exam.subtitle')} />
        <div className="mt-10">
          <AnimatePresence mode="wait">
            {phase === 'setup' && (
              <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <Setup
                  t={t}
                  cfg={cfg}
                  setCfg={setCfg}
                  topics={topics}
                  bank={bank}
                  available={available}
                  n={n}
                  history={history}
                  topicName={topicName}
                  onStart={() => start()}
                />
              </motion.div>
            )}
            {phase === 'play' && q && (
              <motion.div key="play" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <QuestionCard
                  t={t}
                  q={q}
                  index={current}
                  total={test.length}
                  chosen={chosen}
                  locked={locked}
                  mode={cfg.mode}
                  flagged={!!flags[current]}
                  onFlag={() => setFlags((f) => ({ ...f, [current]: !f[current] }))}
                  onChoose={choose}
                  onPrev={() => go(-1)}
                  onNext={next}
                  topicName={topicName}
                />
                <SidePanel
                  t={t}
                  test={test}
                  answers={answers}
                  flags={flags}
                  current={current}
                  mode={cfg.mode}
                  elapsed={elapsed}
                  timeLimit={timeLimit}
                  onJump={setCurrent}
                  onSubmit={trySubmit}
                  onExit={() => setPhase('setup')}
                  confirming={confirming}
                  unanswered={unanswered}
                  onConfirm={finish}
                  onCancel={() => setConfirming(false)}
                />
              </motion.div>
            )}
            {phase === 'results' && (
              <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <Results
                  t={t}
                  test={test}
                  answers={answers}
                  flags={flags}
                  elapsed={elapsed}
                  topicName={topicName}
                  onRetryWrong={(ids) => start(ids)}
                  onNew={() => setPhase('setup')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- configuración --------------------------------- */

function Setup({ t, cfg, setCfg, topics, bank, available, n, history, topicName, onStart }) {
  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }))
  const countFor = (id) => (id === 'all' ? bank.length : bank.filter((q) => q.system === id).length)
  const byLevel = [1, 2, 3].map((l) => bank.filter((q) => q.level === l).length)
  const avg = history.length ? history.reduce((s, h) => s + (h.hits / h.total) * 10, 0) / history.length : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="card flex flex-col gap-7 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink">{t('exam.setup')}</h3>
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-faint tabular-nums">{t('exam.available', { n: available })}</span>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium text-ink">{t('exam.topic')}</legend>
          <div className="flex flex-wrap gap-2">
            {topics.map(([id, name]) => {
              const Icon = SYSTEM_ICONS[id]
              return (
                <button key={id} type="button" className="chip !py-1.5" aria-pressed={cfg.topic === id} onClick={() => set('topic')(id)}>
                  {Icon && <Icon size={14} />}
                  {name}
                  <span className={`mono text-[10px] tabular-nums ${cfg.topic === id ? 'text-white/70' : 'text-ink-faint'}`}>{countFor(id)}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-ink">{t('exam.count')}</span>
            <Segmented label={t('exam.count')} value={cfg.count} onChange={set('count')} options={COUNTS.map((c) => [c, String(c)])} />
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-ink">{t('exam.level')}</span>
            <Segmented label={t('exam.level')} value={cfg.level} onChange={set('level')} options={t('exam.levels').map((l, i) => [i, l])} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-ink">{t('exam.mode')}</span>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('exam.mode')}>
            {['practice', 'exam'].map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={cfg.mode === m}
                onClick={() => set('mode')(m)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                  cfg.mode === m ? 'border-lavender bg-lavender-soft/50 shadow-[0_0_0_3px_rgba(185,166,255,0.18)]' : 'border-line bg-white hover:border-lavender/60'
                }`}
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${cfg.mode === m ? 'border-lavender-ink' : 'border-line-strong'}`}>
                  {cfg.mode === m && <span className="h-2 w-2 rounded-full bg-lavender-ink" />}
                </span>
                <span>
                  <span className="block font-medium text-ink">{t(`exam.modes.${m}.name`)}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{t(`exam.modes.${m}.desc`)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft tabular-nums">
            {available < cfg.count ? t('exam.notEnough', { n: available }) : t('exam.estimate', { n, min: Math.max(1, Math.round((n * (cfg.mode === 'exam' ? SECONDS_PER_Q : 35)) / 60)) })}
          </p>
          <button className="btn btn-primary" onClick={onStart} disabled={available === 0}>
            <PlayIcon size={16} /> {t('exam.start')}
          </button>
        </div>
      </div>

      <aside className="flex flex-col gap-6">
        <div className="card p-6">
          <h3 className="mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('exam.bank')}</h3>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-ink tabular-nums">
            {bank.length} <span className="text-base font-normal text-ink-faint">{t('exam.bankTotal')}</span>
          </p>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-line">
            {byLevel.map((c, i) => (
              <span key={i} style={{ width: `${(c / bank.length) * 100}%`, background: ['#8EC9FF', '#B9A6FF', '#FF8FA3'][i] }} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink-soft">
            {byLevel.map((c, i) => (
              <li key={i} className="flex flex-col">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: ['#8EC9FF', '#B9A6FF', '#FF8FA3'][i] }} />
                  {t('exam.levelShort')[i + 1]}
                </span>
                <span className="mono text-ink tabular-nums">{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card flex-1 p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('exam.history')}</h3>
            {avg != null && (
              <span className="text-xs text-ink-soft">
                {t('exam.average')}: <span className="font-semibold text-ink tabular-nums">{fmtGrade(avg)}</span>
              </span>
            )}
          </div>
          {history.length === 0 ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-faint">
              <BookIcon size={18} className="shrink-0" /> {t('exam.historyEmpty')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {history.map((h) => {
                const g = (h.hits / h.total) * 10
                const k = gradeKey(g)
                return (
                  <li key={h.date} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular-nums" style={{ background: `color-mix(in srgb, ${GRADE_COLOR[k]} 12%, white)`, color: GRADE_COLOR[k] }}>
                      {fmtGrade(g)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{topicName(h.topic)}</span>
                      <span className="block text-xs text-ink-faint tabular-nums">
                        {h.hits}/{h.total} · {t(`exam.modes.${h.mode}.name`)} · {new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

/* ----------------------------------- pregunta ----------------------------------- */

function QuestionCard({ t, q, index, total, chosen, locked, mode, flagged, onFlag, onChoose, onPrev, onNext, topicName }) {
  const Icon = SYSTEM_ICONS[q.system]
  const isLast = index === total - 1
  return (
    <article className="card flex min-w-0 flex-col overflow-hidden" aria-labelledby="pregunta-enunciado">
      <div className="h-1 bg-line">
        <div className="h-full bg-gradient-to-r from-sky via-lavender to-coral transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="mono uppercase tracking-[0.14em] text-ink-faint tabular-nums">{t('exam.question', { i: index + 1, n: total })}</span>
          <span className="mx-1 h-3 w-px bg-line-strong" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-soft px-2.5 py-1 text-sky-ink">
            {Icon && <Icon size={13} />} {short(topicName(q.system))}
          </span>
          <span className="rounded-full bg-bone px-2.5 py-1 text-ink-soft">{t(`exam.kinds.${q.kind}`)}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bone px-2.5 py-1 text-ink-soft">
            <LevelDots level={q.level} /> {t('exam.levelShort')[q.level]}
          </span>
          <button
            type="button"
            onClick={onFlag}
            aria-pressed={flagged}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${flagged ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-line text-ink-soft hover:border-amber-300'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={flagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 21V4m0 0h11l-2 4 2 4H5" strokeLinejoin="round" />
            </svg>
            {flagged ? t('exam.flagged') : t('exam.flag')}
          </button>
        </div>

        <div>
          <h3 id="pregunta-enunciado" className="text-xl font-semibold leading-snug text-ink sm:text-2xl" style={{ textWrap: 'balance' }}>
            {q.prompt}
          </h3>
          {q.quote && <blockquote className="mt-4 rounded-2xl border-l-4 border-lavender bg-lavender-soft/40 px-4 py-3 text-ink-soft">{q.quote}</blockquote>}
        </div>

        <ol className="grid gap-2.5" aria-label="Opciones">
          {q.shuffled.map((opt, i) => {
            const picked = chosen === opt
            const reveal = locked
            const state = reveal ? (opt === q.answer ? 'right' : picked ? 'wrong' : 'dim') : picked ? 'picked' : 'idle'
            const cls = {
              idle: 'border-line bg-white hover:border-lavender hover:bg-lavender-soft/30',
              picked: 'border-lavender-ink bg-lavender-soft/60 shadow-[0_0_0_3px_rgba(185,166,255,0.22)]',
              right: 'border-emerald-400 bg-emerald-50',
              wrong: 'border-coral bg-coral-soft/70',
              dim: 'border-line bg-white opacity-60',
            }[state]
            const badge = {
              idle: 'border-line-strong text-ink-soft group-hover:border-lavender group-hover:text-lavender-ink',
              picked: 'border-lavender-ink bg-lavender-ink text-white',
              right: 'border-emerald-500 bg-emerald-500 text-white',
              wrong: 'border-coral-ink bg-coral-ink text-white',
              dim: 'border-line-strong text-ink-faint',
            }[state]
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => onChoose(opt)}
                  disabled={locked}
                  aria-pressed={picked}
                  className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all ${cls}`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm font-semibold transition-colors ${badge}`}>
                    {state === 'right' ? <CheckIcon size={16} /> : state === 'wrong' ? <CloseIcon size={16} /> : LETTERS[i]}
                  </span>
                  <span className="text-[15px] text-ink">{opt}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <AnimatePresence>
          {locked && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-3 rounded-2xl p-4 text-sm ${chosen === q.answer ? 'bg-emerald-50 text-emerald-900' : 'bg-coral-soft/60 text-coral-ink'}`}
              role="status"
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${chosen === q.answer ? 'bg-emerald-500' : 'bg-coral-ink'} text-white`}>
                {chosen === q.answer ? <CheckIcon size={15} /> : <CloseIcon size={15} />}
              </span>
              <div>
                <p className="font-semibold">{chosen === q.answer ? t('exam.correct') : `${t('exam.wrong')}. ${t('exam.answerWas', { a: q.answer })}`}</p>
                <p className="mt-1 text-ink-soft">{q.explain}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          {mode === 'exam' && (
            <button className="btn btn-ghost !py-2.5 text-sm" onClick={onPrev} disabled={index === 0}>
              <ChevronLeft size={16} /> {t('exam.prev')}
            </button>
          )}
          <p className="hidden text-xs text-ink-faint md:block">{t('exam.keys')}</p>
          <button className="btn btn-primary ml-auto !py-2.5 text-sm" onClick={onNext} disabled={mode === 'practice' && !locked}>
            {isLast ? (mode === 'practice' ? t('exam.finish') : t('exam.submit')) : t('exam.next')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------ panel ------------------------------------ */

function SidePanel({ t, test, answers, flags, current, mode, elapsed, timeLimit, onJump, onSubmit, onExit, confirming, unanswered, onConfirm, onCancel }) {
  const answered = Object.keys(answers).length
  const hits = test.filter((q, i) => answers[i] === q.answer).length
  const left = Math.max(0, timeLimit - elapsed)
  const low = mode === 'exam' && left < 60
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      <div className="card grid grid-cols-2 divide-x divide-line">
        <div className="p-4">
          <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{mode === 'exam' ? t('exam.timeLeft') : t('exam.time')}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${low ? 'text-coral-ink' : 'text-ink'}`}>{fmtTime(mode === 'exam' ? left : elapsed)}</p>
        </div>
        <div className="p-4">
          <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{mode === 'exam' ? t('exam.legend.answered') : t('exam.score')}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {mode === 'exam' ? answered : hits}
            <span className="text-base font-normal text-ink-faint">/{test.length}</span>
          </p>
        </div>
      </div>

      <div className="card p-4">
        <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{t('exam.navigator')}</p>
        <ol className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-6">
          {test.map((q, i) => {
            const a = answers[i]
            const practiceState = mode === 'practice' && a != null ? (a === q.answer ? 'right' : 'wrong') : null
            const cls = practiceState === 'right'
              ? 'bg-emerald-500 text-white border-emerald-500'
              : practiceState === 'wrong'
                ? 'bg-coral-ink text-white border-coral-ink'
                : a != null
                  ? 'bg-lavender-soft text-lavender-ink border-lavender/50'
                  : 'bg-white text-ink-soft border-line'
            return (
              <li key={q.id} className="relative">
                <button
                  type="button"
                  onClick={() => (mode === 'exam' || a != null || i <= current ? onJump(i) : null)}
                  aria-current={i === current ? 'step' : undefined}
                  aria-label={`${i + 1}`}
                  className={`h-8 w-full rounded-lg border text-xs font-medium tabular-nums transition-all ${cls} ${i === current ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                >
                  {i + 1}
                </button>
                {flags[i] && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400" />}
              </li>
            )
          })}
        </ol>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
          <li className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-lavender-soft ring-1 ring-lavender/50" /> {t('exam.legend.answered')}
          </li>
          <li className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> {t('exam.legend.flagged')}
          </li>
          <li className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded ring-2 ring-ink" /> {t('exam.legend.current')}
          </li>
        </ul>
      </div>

      {mode === 'exam' && (
        <div className="card p-4">
          {confirming ? (
            <div className="flex flex-col gap-3" role="alertdialog" aria-label={t('exam.submit')}>
              <p className="text-sm text-ink">{t('exam.confirmSubmit', { n: unanswered })}</p>
              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1 !px-3 !py-2 text-sm" onClick={onCancel}>
                  {t('exam.confirmNo')}
                </button>
                <button className="btn btn-primary flex-1 !px-3 !py-2 text-sm" onClick={onConfirm}>
                  {t('exam.confirmYes')}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary w-full !py-2.5 text-sm" onClick={onSubmit}>
              <CheckIcon size={16} /> {t('exam.submit')}
            </button>
          )}
        </div>
      )}
      <button className="self-start text-sm text-ink-faint underline-offset-4 hover:text-coral-ink hover:underline" onClick={onExit}>
        {t('exam.exit')}
      </button>
    </aside>
  )
}

/* ---------------------------------- resultados ---------------------------------- */

function Results({ t, test, answers, flags, elapsed, topicName, onRetryWrong, onNew }) {
  const [filter, setFilter] = useState('all')
  const select = useExplorer((s) => s.select)
  const byId = useModel((s) => s.byId)
  const hits = test.filter((q, i) => answers[i] === q.answer).length
  const blanks = test.filter((_, i) => answers[i] == null).length
  const misses = test.length - hits - blanks
  const grade = (hits / test.length) * 10
  const key = gradeKey(grade)
  const color = GRADE_COLOR[key]
  const wrongIds = test.filter((q, i) => answers[i] !== q.answer).map((q) => q.id)

  const bySystem = Object.entries(
    test.reduce((m, q, i) => {
      const e = (m[q.system] ||= { ok: 0, total: 0 })
      e.total++
      if (answers[i] === q.answer) e.ok++
      return m
    }, {}),
  ).sort((a, b) => b[1].total - a[1].total)

  const items = test
    .map((q, i) => ({ q, i, a: answers[i] }))
    .filter(({ q, a, i }) => (filter === 'wrong' ? a !== q.answer : filter === 'flagged' ? flags[i] : true))

  const view3d = (id) => {
    select(id, byId[id]?.layer)
    document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${grade * 36}deg, #E6ECF5 0deg)` }}>
            <div className="grid h-[7.6rem] w-[7.6rem] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-4xl font-semibold tabular-nums" style={{ color }}>
                  {fmtGrade(grade)}
                </p>
                <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{t('exam.grade')} / 10</p>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('exam.results')}</p>
              <p className="text-3xl font-semibold tracking-tight" style={{ color }}>
                {t(`exam.grades.${key}`)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [t('exam.hits'), hits, 'text-emerald-700'],
                [t('exam.misses'), misses, 'text-coral-ink'],
                [t('exam.blanks'), blanks, 'text-ink-soft'],
                [t('exam.duration'), fmtTime(elapsed), 'text-ink'],
              ].map(([label, v, c]) => (
                <div key={label} className="rounded-xl bg-bone px-3 py-2">
                  <dt className="text-[11px] text-ink-faint">{label}</dt>
                  <dd className={`text-lg font-semibold tabular-nums ${c}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h3 className="mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('exam.bySystem')}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {bySystem.map(([sys, { ok, total }]) => {
              const Icon = SYSTEM_ICONS[sys]
              const pct = ok / total
              return (
                <li key={sys} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-ink">
                    {Icon && <Icon size={15} className="shrink-0 text-ink-faint" />}
                    <span className="truncate">{short(topicName(sys))}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full" style={{ width: `${pct * 100}%`, background: pct >= 0.7 ? '#34A97A' : pct >= 0.5 ? '#E2A63B' : '#E5627E' }} />
                  </span>
                  <span className="text-right mono text-xs text-ink-soft tabular-nums">
                    {ok}/{total}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            <button className="btn btn-ghost !py-2.5 text-sm" onClick={() => onRetryWrong(wrongIds)} disabled={!wrongIds.length} title={!wrongIds.length ? t('exam.noneWrong') : undefined}>
              <ResetIcon size={16} /> {t('exam.retryWrong')} {wrongIds.length > 0 && <span className="tabular-nums">({wrongIds.length})</span>}
            </button>
            <button className="btn btn-primary !py-2.5 text-sm" onClick={onNew}>
              {t('exam.newTest')} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">{t('exam.review')}</h3>
          <div className="flex gap-1.5" role="group" aria-label={t('exam.review')}>
            {['all', 'wrong', 'flagged'].map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {t(`exam.filters.${f}`)}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-5 flex flex-col gap-3">
          {items.map(({ q, i, a }) => {
            const ok = a === q.answer
            return (
              <li key={q.id} className="rounded-2xl border border-line p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${ok ? 'bg-emerald-500' : a == null ? 'bg-ink-faint' : 'bg-coral-ink'}`}
                    aria-label={ok ? t('exam.correct') : a == null ? t('exam.blank') : t('exam.wrong')}
                  >
                    {ok ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-faint tabular-nums">
                      {i + 1}. {t(`exam.kinds.${q.kind}`)} · {short(topicName(q.system))}
                    </p>
                    <p className="mt-0.5 font-medium text-ink">{q.prompt}</p>
                    {q.quote && <p className="mt-1 text-sm italic text-ink-soft">«{q.quote}»</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {!ok && (
                        <span className="rounded-lg bg-coral-soft/70 px-2.5 py-1 text-coral-ink">
                          {t('exam.yourAnswer')}: {a ?? t('exam.blank')}
                        </span>
                      )}
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800">
                        {t('exam.correctAnswer')}: {q.answer}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">{q.explain}</p>
                  </div>
                  {q.structureId && byId[q.structureId] && (
                    <button className="btn btn-ghost hidden shrink-0 !px-3 !py-1.5 text-xs sm:inline-flex" onClick={() => view3d(q.structureId)}>
                      <FocusIcon size={14} /> {t('exam.viewIn3d')}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
