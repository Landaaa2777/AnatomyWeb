import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { useExplorer, LAYERS } from '../state/explorer.js'
import { useModel } from '../anatomy/loader.js'
import { useMediaQuery, useNearViewport } from '../lib/hooks.js'
import { SectionHeader, Reveal } from './Section.jsx'
import { HudFrame } from './HudFrame.jsx'
import { ModelStatus } from './ModelStatus.jsx'
import { SYSTEM_ICONS, ArrowRight } from './icons.jsx'

const AnatomyViewer = lazy(() => import('../three/AnatomyViewer.jsx'))

const ALL_VISIBLE = Object.fromEntries(LAYERS.map((l) => [l, true]))
const SYSTEM_COLOR = {
  oseo: '#8EB4E8',
  muscular: '#FF8FA3',
  circulatorio: '#F2647F',
  nervioso: '#B9A6FF',
  respiratorio: '#F7A6BA',
  digestivo: '#F5A08A',
  urinario: '#E9B558',
  endocrino: '#EB79A3',
  linfatico: '#CF6C9E',
  tegumentario: '#8EC9FF',
}
const SYSTEM_VIEW = { respiratorio: 'organs', digestivo: 'organs', urinario: 'organs', endocrino: 'organs', linfatico: 'organs' }

export function Systems() {
  const { t, content, nameOf } = useI18n()
  const [active, setActive] = useState('oseo')
  const [hovered, setHovered] = useState(null)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [nearRef, near] = useNearViewport('300px')
  const byId = useModel((s) => s.byId)
  const select = useExplorer((s) => s.select)
  const setVisible = useExplorer((s) => s.setVisible)

  const ids = useMemo(
    () => Object.entries(content.structures).filter(([, s]) => s.sistemas.includes(active)).map(([id]) => id),
    [active, content],
  )
  const idSet = useMemo(() => new Set(ids), [ids])
  // estructuras del sistema + la piel como referencia translúcida
  const filter = useMemo(() => (p) => idSet.has(p.id) || p.layer === 'piel', [idSet])
  const system = content.systems.find((s) => s.id === active)

  const openInExplorer = (id) => {
    const layersNeeded = new Set(ids.map((i) => byId[i]?.layer).filter(Boolean))
    setVisible(Object.fromEntries(LAYERS.map((l) => [l, layersNeeded.has(l) || l === 'piel'])))
    select(id ?? null, id ? byId[id]?.layer : undefined)
    document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="sistemas" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow={t('systems.eyebrow')} title={t('systems.title')} subtitle={t('systems.subtitle')} />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {content.systems.map((sys, i) => {
              const Icon = SYSTEM_ICONS[sys.id]
              const color = SYSTEM_COLOR[sys.id]
              const on = sys.id === active
              const n = Object.values(content.structures).filter((s) => s.sistemas.includes(sys.id)).length
              return (
                <Reveal key={sys.id} delay={(i % 4) * 0.05}>
                  <button
                    onClick={() => setActive(sys.id)}
                    aria-pressed={on}
                    className={`group relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300 ${
                      on ? 'border-transparent bg-white shadow-[var(--shadow-lift)]' : 'border-line bg-white/70 hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-soft)]'
                    }`}
                    style={on ? { boxShadow: `0 0 0 1.5px ${color}, var(--shadow-lift)` } : undefined}
                  >
                    <span
                      className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
                      style={{ background: color, opacity: on ? 0.35 : undefined }}
                      aria-hidden="true"
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${color} 16%, white)`, color }}>
                        {Icon && <Icon size={22} />}
                      </span>
                      <span className="mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{t('systems.count', { n })}</span>
                    </div>
                    <div className="relative">
                      <h3 className="text-lg font-semibold text-ink">{sys.nombre}</h3>
                      <p className="mt-0.5 text-sm font-medium" style={{ color: `color-mix(in srgb, ${color} 75%, #2B3445)` }}>
                        {sys.dato}
                      </p>
                    </div>
                    <p className="relative text-sm leading-relaxed text-ink-soft line-clamp-3">{sys.descripcion}</p>
                  </button>
                </Reveal>
              )
            })}
          </div>

          <div className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
            <div className="relative h-[70svh] min-h-[520px] overflow-hidden rounded-[2rem] border border-line bg-gradient-to-b from-white to-bone">
              <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" aria-hidden="true" />
              <div ref={nearRef} className="absolute inset-0">
                {near && (
                  <Suspense fallback={null}>
                    <AnatomyViewer
                      visible={ALL_VISIBLE}
                      filter={filter}
                      hovered={hovered}
                      onHover={setHovered}
                      onSelect={(id) => openInExplorer(id)}
                      labels={desktop ? ids.slice(0, 9) : []}
                      nameOf={nameOf}
                      view={SYSTEM_VIEW[active] || 'full'}
                      focusOnSelect={false}
                      dimOthers={false}
                      autoRotate
                      intro={false}
                      zoom={false}
                      touchRotate={desktop}
                      decor
                      ariaLabel={system?.nombre}
                    />
                  </Suspense>
                )}
              </div>
              <HudFrame ruler={false} readouts={false} />
              <ModelStatus variant="pill" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-3 rounded-3xl glass-strong p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{system?.dato}</p>
                    <h3 className="text-lg font-semibold text-ink">{system?.nombre}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{ids.map((id) => content.structures[id].nombre).join(' · ')}</p>
                  </div>
                  <button className="btn btn-primary shrink-0 !py-2.5 text-sm" onClick={() => openInExplorer(null)}>
                    {t('systems.open')} <ArrowRight size={16} />
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
