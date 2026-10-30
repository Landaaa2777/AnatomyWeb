import { useModel } from '../anatomy/loader.js'
import { useI18n } from '../i18n/index.jsx'

/** Marco decorativo tipo HUD: esquinas, lecturas, regla de altura e indicadores. */
export function HudFrame({ layersOn = 0, ruler = true, readouts = true, className = '' }) {
  const { t } = useI18n()
  const ready = useModel((s) => s.ready)
  const total = useModel((s) => s.total)
  const pct = Math.round((ready / total) * 100)
  return (
    <div className={`pointer-events-none absolute inset-0 z-10 select-none ${className}`} aria-hidden="true">
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />

      {readouts && (
        <div className="absolute right-6 top-6 hidden sm:flex flex-col items-end gap-1.5 mono text-[10px] tracking-[0.16em] text-ink-faint">
          <div className="flex items-center gap-2">
            <span>{t('hud.scan')}</span>
            <span className="text-sky-ink">{String(pct).padStart(3, '0')}%</span>
          </div>
          <div className="h-[3px] w-28 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-sky via-lavender to-coral transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-2">
            <span>{t('hud.layers')}</span>
            <span className="text-lavender-ink">{layersOn}/6</span>
          </div>
        </div>
      )}

      {ruler && (
        <div className="absolute left-6 top-[12%] bottom-[10%] hidden md:flex flex-col justify-between mono text-[9px] text-ink-faint">
          {[180, 150, 120, 90, 60, 30, 0].map((cm) => (
            <div key={cm} className="flex items-center gap-1.5">
              <span className="block h-px w-3 bg-sky/70" />
              <span>{cm}</span>
            </div>
          ))}
          <span className="absolute -left-0.5 top-0 bottom-0 w-px bg-gradient-to-b from-sky/0 via-sky/60 to-sky/0" />
        </div>
      )}

      {readouts && (
        <div className="absolute bottom-6 right-6 hidden sm:flex items-center gap-1.5">
          {['#8EC9FF', '#FF8FA3', '#B9A6FF', '#F5A08A', '#8EB4E8'].map((c, i) => (
            <span key={c} className="h-1.5 rounded-full animate-pulse-soft" style={{ width: 10 + i * 4, background: c, animationDelay: `${i * 0.3}s` }} />
          ))}
          <span className="ml-2 mono text-[10px] tracking-[0.16em] text-ink-faint">{t('hud.model')} 3D</span>
        </div>
      )}
    </div>
  )
}
