import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { useModel } from '../anatomy/loader.js'
import { useNearViewport, storage, shuffle, useMediaQuery } from '../lib/hooks.js'
import { HudFrame } from './HudFrame.jsx'
import { ModelStatus } from './ModelStatus.jsx'
import { TargetIcon, CardsIcon, PlayIcon, CheckIcon, CloseIcon, ArrowRight, ResetIcon } from './icons.jsx'

const AnatomyViewer = lazy(() => import('../three/AnatomyViewer.jsx'))
const N_QUESTIONS = 10

/** Quiz sobre el modelo 3D: señalar estructuras o identificar la resaltada. */
export function Quiz() {
  const { t, content, nameOf } = useI18n()
  const byId = useModel((s) => s.byId)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [nearRef, near] = useNearViewport('300px')
  const [mode, setMode] = useState('point')
  const [system, setSystem] = useState('all')
  const [phase, setPhase] = useState('intro')
  const [questions, setQuestions] = useState([])
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null) // { picked, ok }
  const [score, setScore] = useState(0)
  const [hovered, setHovered] = useState(null)
  const [best, setBest] = useState(() => storage.get('anatomia3d.best', {}))

  const eligible = useMemo(
    () =>
      Object.entries(content.structures)
        .filter(([id, s]) => byId[id] && byId[id].layer !== 'piel' && (system === 'all' || s.sistemas.includes(system)))
        .map(([id]) => id),
    [content, byId, system],
  )

  const start = () => {
    const picked = shuffle(eligible).slice(0, Math.min(N_QUESTIONS, eligible.length))
    setQuestions(
      picked.map((id) => {
        const layer = byId[id].layer
        const sameLayer = shuffle(eligible.filter((x) => x !== id && byId[x].layer === layer))
        const others = shuffle(Object.keys(byId).filter((x) => x !== id && byId[x].layer !== 'piel' && !sameLayer.includes(x)))
        return { id, options: shuffle([id, ...[...sameLayer, ...others].slice(0, 3)]) }
      }),
    )
    setQi(0)
    setScore(0)
    setAnswer(null)
    setPhase('play')
  }

  const q = questions[qi]
  const target = q?.id
  const targetLayer = target ? byId[target]?.layer : null

  const respond = (picked) => {
    if (answer || !target) return
    const ok = picked === target
    setAnswer({ picked, ok })
    if (ok) setScore((s) => s + 1)
  }

  const next = () => {
    if (qi + 1 >= questions.length) {
      const key = `${mode}`
      const finalScore = score
      const nb = { ...best, [key]: Math.max(best[key] || 0, finalScore) }
      setBest(nb)
      storage.set('anatomia3d.best', nb)
      setPhase('done')
    } else {
      setQi((i) => i + 1)
      setAnswer(null)
    }
  }

  const visible = useMemo(
    () => (targetLayer ? { piel: true, [targetLayer]: true } : { piel: true, esqueleto: true, organos: true, circulatorio: true }),
    [targetLayer],
  )

  const playing = phase === 'play' && q
  const showSelected = playing && (mode === 'choice' || answer) ? target : null
  const emphasis = playing && answer && answer.picked && answer.picked !== target ? [target, answer.picked] : []

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <div className="relative h-[62svh] min-h-[480px] overflow-hidden rounded-[2rem] border border-line bg-gradient-to-b from-white to-bone">
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" aria-hidden="true" />
        <div ref={nearRef} className="absolute inset-0">
          {near && (
            <Suspense fallback={null}>
              <AnatomyViewer
                visible={visible}
                selected={showSelected}
                emphasis={emphasis}
                hovered={playing && mode === 'point' && !answer ? hovered : null}
                onHover={setHovered}
                onSelect={(id) => playing && mode === 'point' && respond(id)}
                interactive={!!playing && mode === 'point' && !answer}
                dimOthers={!!answer || mode === 'choice'}
                focusOnSelect
                view="full"
                resetSignal={qi + 1 + (phase === 'play' ? 100 : 0)}
                autoRotate={!playing}
                intro={false}
                zoom={desktop}
                ariaLabel={t('study.tabs.quiz')}
              />
            </Suspense>
          )}
        </div>
        <HudFrame ruler={false} readouts={false} />
        <ModelStatus variant="pill" />
        {playing && (
          <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-3 rounded-2xl glass-strong px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavender-soft text-lavender-ink">
              {mode === 'point' ? <TargetIcon size={18} /> : <CardsIcon size={18} />}
            </span>
            <div className="min-w-0">
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{t('study.quiz.question', { i: qi + 1, n: questions.length })}</p>
              <p className="truncate font-medium text-ink">
                {mode === 'point' ? (
                  <>
                    {t('study.quiz.pointPrompt')}: <span className="text-gradient font-semibold">{nameOf(target)}</span>
                  </>
                ) : (
                  t('study.quiz.choicePrompt')
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card flex flex-col p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-1 flex-col gap-5">
              <p className="text-ink-soft">{t('study.quiz.intro')}</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Modo">
                {['point', 'choice'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                      mode === m ? 'border-lavender bg-lavender-soft/60 text-lavender-ink' : 'border-line bg-white text-ink-soft hover:border-lavender/60'
                    }`}
                  >
                    {m === 'point' ? <TargetIcon size={20} /> : <CardsIcon size={20} />}
                    <span className="text-sm font-medium">{t(`study.quiz.modes.${m}`)}</span>
                    {best[m] != null && <span className="mono text-[10px] text-ink-faint">★ {best[m]}/{N_QUESTIONS}</span>}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('study.deck')}>
                <button className="chip" aria-pressed={system === 'all'} onClick={() => setSystem('all')}>
                  {t('study.allSystems')}
                </button>
                {content.systems
                  .filter((s) => s.id !== 'tegumentario')
                  .map((s) => (
                    <button key={s.id} className="chip" aria-pressed={system === s.id} onClick={() => setSystem(s.id)}>
                      {t(`systemNames.${s.id}`)}
                    </button>
                  ))}
              </div>
              <button className="btn btn-primary mt-auto" onClick={start} disabled={eligible.length === 0}>
                <PlayIcon size={16} /> {t('study.quiz.start')}
              </button>
            </motion.div>
          )}

          {playing && (
            <motion.div key={`q${qi}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-1 flex-col gap-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t('study.quiz.question', { i: qi + 1, n: questions.length })}</span>
                <span className="mono text-lavender-ink">
                  {t('study.quiz.score')}: {score}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-gradient-to-r from-sky via-lavender to-coral transition-all duration-500" style={{ width: `${((qi + (answer ? 1 : 0)) / questions.length) * 100}%` }} />
              </div>

              {mode === 'point' && !answer && (
                <div className="rounded-2xl border border-dashed border-lavender/50 bg-lavender-soft/40 p-4 text-sm text-ink-soft">
                  <p className="font-medium text-ink">
                    {t('study.quiz.pointPrompt')}: {nameOf(target)}
                  </p>
                  <p className="mt-1">{t('study.quiz.pointHelp')}</p>
                </div>
              )}

              {mode === 'choice' && (
                <div className="grid gap-2">
                  {q.options.map((opt) => {
                    const state = !answer ? 'idle' : opt === target ? 'right' : opt === answer.picked ? 'wrong' : 'idle'
                    return (
                      <button
                        key={opt}
                        onClick={() => respond(opt)}
                        disabled={!!answer}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                          state === 'right'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : state === 'wrong'
                              ? 'border-coral bg-coral-soft text-coral-ink'
                              : 'border-line bg-white text-ink hover:border-lavender hover:bg-lavender-soft/40'
                        }`}
                      >
                        {nameOf(opt)}
                        {state === 'right' && <CheckIcon size={16} />}
                        {state === 'wrong' && <CloseIcon size={16} />}
                      </button>
                    )
                  })}
                </div>
              )}

              {answer && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl p-4 text-sm ${answer.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-coral-soft text-coral-ink'}`}
                  role="status"
                >
                  <p className="font-semibold">{answer.ok ? t('study.quiz.correct') : t('study.quiz.wrong', { name: nameOf(target) })}</p>
                  {!answer.ok && answer.picked && mode === 'point' && <p className="mt-1 opacity-80">{t('study.quiz.youPicked', { name: nameOf(answer.picked) })}</p>}
                  <p className="mt-2 text-ink-soft">{content.structures[target]?.funcion}</p>
                </motion.div>
              )}

              <div className="mt-auto flex gap-2">
                {!answer && (
                  <button className="btn btn-ghost !py-2.5 text-sm" onClick={() => respond(null)}>
                    {t('study.quiz.skip')}
                  </button>
                )}
                {answer && (
                  <button className="btn btn-primary ml-auto !py-2.5 text-sm" onClick={next}>
                    {qi + 1 >= questions.length ? t('study.quiz.finish') : t('study.quiz.next')} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="relative grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(#8B6CF6 ${(score / questions.length) * 360}deg, #E6ECF5 0deg)` }}>
                <div className="grid h-[6.8rem] w-[6.8rem] place-items-center rounded-full bg-white">
                  <span className="text-3xl font-semibold text-ink">
                    {score}
                    <span className="text-base text-ink-faint">/{questions.length}</span>
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-ink">{t('study.quiz.resultTitle')}</h3>
              <p className="text-ink-soft">{t('study.quiz.result', { score, n: questions.length })}</p>
              <p className="mono text-xs text-ink-faint">{t('study.quiz.best', { best: best[mode] ?? score })}</p>
              <div className="flex gap-2">
                <button className="btn btn-ghost !py-2.5 text-sm" onClick={() => setPhase('intro')}>
                  <ResetIcon size={16} /> {t('study.restart')}
                </button>
                <button className="btn btn-primary !py-2.5 text-sm" onClick={start}>
                  <PlayIcon size={16} /> {t('study.quiz.again')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
