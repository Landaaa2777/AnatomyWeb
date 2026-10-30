import { AnimatePresence, motion } from 'framer-motion'
import { useModel } from '../anatomy/loader.js'
import { useI18n } from '../i18n/index.jsx'

const TOTAL_STEPS = 76

/** Estado de carga del modelo: overlay central hasta la primera capa y luego una píldora discreta. */
export function ModelStatus({ variant = 'overlay' }) {
  const { t } = useI18n()
  const ready = useModel((s) => s.ready)
  const total = useModel((s) => s.total)
  const steps = useModel((s) => s.steps)
  const error = useModel((s) => s.error)
  const pct = Math.round(Math.min(1, Math.max(ready / total, steps / TOTAL_STEPS)) * 100)
  const done = ready >= total

  if (error) {
    return (
      <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl glass-strong px-4 py-3 text-sm text-coral-ink" role="alert">
        {t('hud.error')}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {!done && ready === 0 && variant === 'overlay' && (
        <motion.div
          key="overlay"
          className="absolute inset-0 z-20 grid place-items-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#E6ECF5" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="url(#ld)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
                <defs>
                  <linearGradient id="ld" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8EC9FF" />
                    <stop offset="0.6" stopColor="#B9A6FF" />
                    <stop offset="1" stopColor="#FF8FA3" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center mono text-sm text-ink">{pct}%</div>
            </div>
            <p className="mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">{t('hud.generating')}</p>
          </div>
        </motion.div>
      )}
      {!done && (ready > 0 || variant === 'pill') && (
        <motion.div
          key="pill"
          className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full glass-strong px-3.5 py-1.5 mono text-[11px] uppercase tracking-[0.14em] text-ink-soft flex items-center gap-2"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
          aria-live="polite"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lavender animate-pulse-soft" />
          {t('hud.loadingLayers', { done: ready, total })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
