import { lazy, Suspense, useMemo, useState } from 'react'
import { buildQuestionBank } from '../lib/questionBank.js'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { useExplorer, DEFAULT_VISIBLE } from '../state/explorer.js'
import { useMediaQuery, useNearViewport } from '../lib/hooks.js'
import { useModel } from '../anatomy/loader.js'
import { HudFrame } from './HudFrame.jsx'
import { ModelStatus } from './ModelStatus.jsx'
import { ArrowRight, CardsIcon, RotateIcon } from './icons.jsx'

const AnatomyViewer = lazy(() => import('../three/AnatomyViewer.jsx'))

const HERO_LABELS = ['craneo', 'pulmones', 'corazon', 'higado', 'intestino-delgado', 'femur', 'aorta']

export function Hero() {
  const { t, content, nameOf } = useI18n()
  const select = useExplorer((s) => s.select)
  const [hovered, setHovered] = useState(null)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [ref, near] = useNearViewport('200px')
  const { scrollY } = useScroll()
  const glowY = useTransform(scrollY, [0, 800], [0, 120])
  const gridY = useTransform(scrollY, [0, 800], [0, -60])
  const nStructures = Object.keys(content.structures).length
  const nQuestions = useMemo(() => buildQuestionBank(content).length, [content])
  const nSystems = content.systems.length

  // clic en el hero: abre esa estructura en el explorador
  const goTo = (id) => {
    select(id, useModel.getState().byId[id]?.layer)
    document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="inicio" className="relative overflow-hidden pt-24 lg:pt-20">
      <motion.div style={{ y: gridY }} className="absolute inset-0 grid-bg opacity-70 pointer-events-none" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 sm:px-6 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1fr_1.05fr]">
        <div className="relative z-10 flex flex-col gap-6 py-8 lg:py-0">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 mono text-[11px] uppercase tracking-[0.14em] text-lavender-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-coral animate-pulse-soft" />
            {t('hero.badge')}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-[2.6rem] sm:text-6xl lg:text-[4.2rem] font-semibold leading-[1.02] tracking-tight text-ink"
          >
            {t('hero.title1')} <span className="text-gradient">{t('hero.title2')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-xl text-base sm:text-lg leading-relaxed text-ink-soft"
          >
            {t('hero.subtitle')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <a href="#explorar" className="btn btn-primary">
              {t('hero.explore')} <ArrowRight size={18} />
            </a>
            <a href="#estudio" className="btn btn-ghost">
              <CardsIcon size={18} /> {t('hero.study')}
            </a>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-2 grid max-w-md grid-cols-3 gap-3"
          >
            {[
              [nStructures, t('hero.stats.structures'), 'text-sky-ink'],
              [nQuestions, t('hero.stats.questions'), 'text-coral-ink'],
              [nSystems, t('hero.stats.systems'), 'text-lavender-ink'],
            ].map(([n, label, color]) => (
              <div key={label} className="rounded-2xl glass px-4 py-3">
                <dt className="sr-only">{label}</dt>
                <dd className={`text-2xl font-semibold tabular-nums ${color}`}>{n}</dd>
                <dd className="text-xs text-ink-faint">{label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <div ref={ref} className="relative h-[72svh] min-h-[460px] lg:h-[calc(100svh-6rem)]">
          <motion.div
            style={{ y: glowY }}
            className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(185,166,255,0.2),rgba(142,201,255,0.08)_45%,transparent_68%)] blur-2xl"
            aria-hidden="true"
          />
          {near && (
            <Suspense fallback={null}>
              <AnatomyViewer
                visible={DEFAULT_VISIBLE}
                autoRotate="sway"
                viewShift={desktop ? -70 : 0}
                intro
                zoom={false}
                touchRotate={desktop}
                focusOnSelect={false}
                dimOthers={false}
                view="hero"
                halfSkin
                labels={desktop ? HERO_LABELS : []}
                nameOf={nameOf}
                hovered={hovered}
                onHover={setHovered}
                onSelect={goTo}
                ariaLabel={t('hero.title1') + ' ' + t('hero.title2')}
              />
            </Suspense>
          )}
          <HudFrame layersOn={4} />
          <ModelStatus />
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full glass px-3 py-1.5 mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <RotateIcon size={14} /> {t('hero.drag')}
          </div>
        </div>
      </div>
    </section>
  )
}
