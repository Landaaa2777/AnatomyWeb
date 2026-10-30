import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { useExplorer, labelsFor } from '../state/explorer.js'
import { useMediaQuery, useNearViewport } from '../lib/hooks.js'
import { SectionHeader } from './Section.jsx'
import { LayerPanel } from './LayerPanel.jsx'
import { SearchBox } from './SearchBox.jsx'
import { InfoCard } from './InfoCard.jsx'
import { HudFrame } from './HudFrame.jsx'
import { ModelStatus } from './ModelStatus.jsx'
import { LayersIcon, TagIcon, ResetIcon, ExpandIcon, ShrinkIcon, CloseIcon, RotateIcon, HalfBodyIcon } from './icons.jsx'

const AnatomyViewer = lazy(() => import('../three/AnatomyViewer.jsx'))

// márgenes de encuadre: panel de capas a la izquierda y ficha a la derecha (escritorio) o abajo (móvil)
const INSET_DESKTOP = { left: 0.55, right: 0.85, top: 0.12, bottom: 0.12 }
const INSET_MOBILE = { left: 0.15, right: 0.15, top: 0.1, bottom: 1.1 }

export function Explorer() {
  const { t, nameOf } = useI18n()
  const visible = useExplorer((s) => s.visible)
  const selected = useExplorer((s) => s.selected)
  const hovered = useExplorer((s) => s.hovered)
  const isolated = useExplorer((s) => s.isolated)
  const labelsOn = useExplorer((s) => s.labels)
  const halfSkin = useExplorer((s) => s.halfSkin)
  const view = useExplorer((s) => s.view)
  const resetSignal = useExplorer((s) => s.resetSignal)
  const { select, setHovered, toggleIsolate, toggleLabels, toggleHalfSkin, setView, reset } = useExplorer.getState()

  const desktop = useMediaQuery('(min-width: 1024px)')
  const coarse = useMediaQuery('(pointer: coarse)')
  const [panelOpen, setPanelOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const boxRef = useRef(null)
  const [nearRef, near] = useNearViewport('150px')

  const layersOn = Object.values(visible).filter(Boolean).length
  const labels = useMemo(() => {
    if (!labelsOn) return []
    if (selected) return [selected]
    return desktop ? labelsFor(visible, 14) : []
  }, [labelsOn, isolated, selected, visible, desktop])

  const filter = useMemo(() => (isolated && selected ? (p) => p.id === selected : undefined), [isolated, selected])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && useExplorer.getState().selected) select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === boxRef.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else boxRef.current?.requestFullscreen?.().catch(() => {})
  }, [])

  const views = ['full', 'side', 'back']

  return (
    <section id="explorar" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow={t('explorer.eyebrow')} title={t('explorer.title')} subtitle={t('explorer.subtitle')} />

        <div
          ref={boxRef}
          className={`relative mt-10 overflow-hidden border border-line bg-gradient-to-b from-white via-white to-bone shadow-[0_30px_80px_-40px_rgba(94,69,201,0.35)] ${
            fullscreen ? 'h-screen w-screen rounded-none' : 'h-[84svh] min-h-[600px] rounded-[2rem]'
          }`}
        >
          <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" aria-hidden="true" />

          <div ref={nearRef} className="absolute inset-0">
            {near && (
              <Suspense fallback={null}>
                <AnatomyViewer
                  visible={visible}
                  filter={filter}
                  hovered={hovered}
                  selected={selected}
                  labels={labels}
                  nameOf={nameOf}
                  onHover={setHovered}
                  onSelect={(id) => select(id)}
                  onMissed={() => select(null)}
                  view={view}
                  resetSignal={resetSignal}
                  intro={false}
                  focusInset={desktop ? INSET_DESKTOP : INSET_MOBILE}
                  halfSkin={halfSkin}
                  viewShift={desktop ? (selected ? -40 : 150) : 0}
                  ariaLabel={t('explorer.title')}
                />
              </Suspense>
            )}
          </div>

          <HudFrame layersOn={layersOn} ruler={desktop} readouts={false} />
          <ModelStatus variant="pill" />

          {/* barra superior */}
          <div className="absolute inset-x-3 top-3 z-20 flex items-center gap-2 sm:inset-x-4 sm:top-4">
            {!desktop && (
              <button className="icon-btn glass-strong shrink-0" onClick={() => setPanelOpen(true)} aria-label={t('explorer.panel')} aria-expanded={panelOpen}>
                <LayersIcon size={19} />
              </button>
            )}
            <SearchBox onSelect={(id, layer) => select(id, layer)} className="min-w-0 flex-1 lg:ml-[19.5rem] lg:max-w-md" />
            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-2xl glass-strong p-1">
              <div className="hidden sm:flex items-center gap-0.5" role="group" aria-label="Vista">
                {views.map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${view === v ? 'bg-ink text-white' : 'text-ink-soft hover:bg-lavender-soft hover:text-lavender-ink'}`}
                  >
                    {t(`explorer.views.${v}`)}
                  </button>
                ))}
              </div>
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
              <button className="icon-btn !h-9 !w-9" onClick={toggleLabels} aria-pressed={labelsOn} aria-label={t('explorer.labels')} title={t('explorer.labels')}>
                <TagIcon size={18} />
              </button>
              <button className="icon-btn !h-9 !w-9" onClick={toggleHalfSkin} aria-pressed={halfSkin} aria-label={t('explorer.halfSkin')} title={t('explorer.halfSkin')}>
                <HalfBodyIcon size={18} />
              </button>
              <button className="icon-btn !h-9 !w-9" onClick={reset} aria-label={t('explorer.reset')} title={t('explorer.reset')}>
                <ResetIcon size={18} />
              </button>
              <button
                className="icon-btn !h-9 !w-9 hidden sm:inline-grid"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? t('explorer.exitFullscreen') : t('explorer.fullscreen')}
                title={fullscreen ? t('explorer.exitFullscreen') : t('explorer.fullscreen')}
              >
                {fullscreen ? <ShrinkIcon size={18} /> : <ExpandIcon size={18} />}
              </button>
            </div>
          </div>

          {/* panel de capas */}
          {desktop ? (
            <aside className="scroll-thin absolute bottom-4 left-4 top-4 z-10 w-72 overflow-y-auto rounded-3xl glass p-4" aria-label={t('explorer.panel')}>
              <LayerPanel />
            </aside>
          ) : (
            <AnimatePresence>
              {panelOpen && (
                <>
                  <motion.div
                    className="absolute inset-0 z-30 bg-ink/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setPanelOpen(false)}
                  />
                  <motion.aside
                    className="scroll-thin absolute bottom-3 left-3 top-3 z-40 w-[min(20rem,calc(100%-1.5rem))] overflow-y-auto rounded-3xl glass-strong p-4"
                    initial={{ x: '-110%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-110%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    aria-label={t('explorer.panel')}
                  >
                    <button className="icon-btn absolute right-3 top-3" onClick={() => setPanelOpen(false)} aria-label={t('card.close')}>
                      <CloseIcon size={18} />
                    </button>
                    <LayerPanel onPicked={() => setPanelOpen(false)} />
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          )}

          {/* ficha */}
          <AnimatePresence mode="wait">
            {selected && (
              <div
                key={selected}
                className={desktop ? 'absolute bottom-4 right-4 top-[4.75rem] z-20 flex w-[22.5rem]' : 'absolute inset-x-3 bottom-3 z-20 flex max-h-[56%]'}
              >
                <InfoCard
                  id={selected}
                  isolated={isolated}
                  onIsolate={toggleIsolate}
                  onClose={() => select(null)}
                  onNavigate={(id) => select(id)}
                  className="w-full"
                />
              </div>
            )}
          </AnimatePresence>

          {!selected && (
            <p className="pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full glass px-3.5 py-1.5 text-[11px] text-ink-faint lg:ml-36">
              <RotateIcon size={14} />
              <span className="hidden sm:inline">{coarse ? t('explorer.hintTouch') : t('explorer.hint')}</span>
              <span className="sm:hidden">{t('explorer.hintTouch').split('·')[0]}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
