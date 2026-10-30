import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { useModel } from '../anatomy/loader.js'
import { LAYER_ACCENT } from '../three/palette.js'
import { SYSTEM_ICONS, CloseIcon, FocusIcon, ChevronLeft, ChevronRight, SparkIcon } from './icons.jsx'

/** Ficha de una estructura: nombre, latín, función, ubicación, curiosidades y patologías. */
export function InfoCard({ id, isolated, onIsolate, onClose, onNavigate, className = '' }) {
  const { t, content } = useI18n()
  const part = useModel((s) => s.byId[id])
  const layers = useModel((s) => s.layers)
  const s = content.structures[id]
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [id])

  if (!s) return null
  const layer = part?.layer
  const accent = LAYER_ACCENT[layer] || '#B9A6FF'
  const siblings = (layers[layer] || []).map((p) => p.id)
  const idx = siblings.indexOf(id)

  return (
    <motion.article
      key={id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex max-h-full flex-col overflow-hidden rounded-3xl glass-strong ${className}`}
      aria-labelledby="ficha-titulo"
    >
      <div className="relative px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 16%, white), white 70%)` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {layer && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {t('card.layer')}: {t(`layers.${layer}.name`)}
              </span>
            )}
            {s.sistemas.map((sys) => {
              const Icon = SYSTEM_ICONS[sys]
              return (
                <span key={sys} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-ink-soft">
                  {Icon && <Icon size={13} />} {t(`systemNames.${sys}`)}
                </span>
              )
            })}
          </div>
          <button className="icon-btn -mr-1 -mt-1 shrink-0" onClick={onClose} aria-label={t('card.close')}>
            <CloseIcon size={18} />
          </button>
        </div>
        <h3 id="ficha-titulo" ref={headingRef} tabIndex={-1} className="no-ring mt-3 text-2xl font-semibold tracking-tight text-ink">
          {s.nombre}
        </h3>
        <p className="mt-0.5 text-sm italic text-ink-faint">{s.latin}</p>
      </div>

      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
        <Field title={t('card.function')} accent={accent}>
          {s.funcion}
        </Field>
        <Field title={t('card.location')} accent={accent}>
          {s.ubicacion}
        </Field>
        <section>
          <h4 className="mb-2 mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{t('card.facts')}</h4>
          <ul className="space-y-2">
            {s.datos.map((d) => (
              <li key={d} className="flex gap-2.5 rounded-2xl bg-lavender-soft/60 px-3 py-2.5 text-ink-soft">
                <SparkIcon size={16} className="mt-0.5 shrink-0 text-lavender-ink" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="mb-2 mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{t('card.pathologies')}</h4>
          <ul className="flex flex-wrap gap-1.5">
            {s.patologias.map((p) => (
              <li key={p} className="rounded-full border border-coral/40 bg-coral-soft/60 px-2.5 py-1 text-[12px] text-coral-ink">
                {p}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <button className="icon-btn" onClick={() => onNavigate(siblings[(idx - 1 + siblings.length) % siblings.length])} aria-label={t('card.prev')} disabled={siblings.length < 2}>
          <ChevronLeft size={18} />
        </button>
        <button className="icon-btn" onClick={() => onNavigate(siblings[(idx + 1) % siblings.length])} aria-label={t('card.next')} disabled={siblings.length < 2}>
          <ChevronRight size={18} />
        </button>
        <span className="mono text-[10px] text-ink-faint">
          {idx + 1}/{siblings.length}
        </span>
        <button className={`btn ml-auto !py-2 !px-3.5 text-sm ${isolated ? 'btn-primary' : 'btn-ghost'}`} onClick={onIsolate} aria-pressed={isolated}>
          <FocusIcon size={16} /> {isolated ? t('card.showAll') : t('card.isolate')}
        </button>
      </div>
    </motion.article>
  )
}

function Field({ title, accent, children }) {
  return (
    <section>
      <h4 className="mb-1 flex items-center gap-2 mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        <span className="h-px w-3" style={{ background: accent }} />
        {title}
      </h4>
      <p className="text-ink-soft">{children}</p>
    </section>
  )
}
