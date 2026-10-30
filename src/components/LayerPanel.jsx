import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { useExplorer, LAYERS } from '../state/explorer.js'
import { useModel } from '../anatomy/loader.js'
import { LAYER_ACCENT } from '../three/palette.js'
import { LAYER_ICONS, EyeIcon, EyeOffIcon, ChevronDown } from './icons.jsx'

/** Panel lateral: capas, control de profundidad e índice de estructuras. */
export function LayerPanel({ onPicked }) {
  const { t, content } = useI18n()
  const visible = useExplorer((s) => s.visible)
  const toggleLayer = useExplorer((s) => s.toggleLayer)
  const setDepth = useExplorer((s) => s.setDepth)
  const showAll = useExplorer((s) => s.showAll)
  const hideAll = useExplorer((s) => s.hideAll)
  const selected = useExplorer((s) => s.selected)
  const select = useExplorer((s) => s.select)
  const layers = useModel((s) => s.layers)
  const [indexOpen, setIndexOpen] = useState(false)

  // profundidad = número de capas externas ocultas consecutivas
  const depth = useMemo(() => {
    let d = 0
    while (d < LAYERS.length - 1 && !visible[LAYERS[d]]) d++
    return d
  }, [visible])

  const counts = Object.fromEntries(LAYERS.map((l) => [l, layers[l]?.length ?? 0]))
  const visibleIds = LAYERS.filter((l) => visible[l]).flatMap((l) => (layers[l] || []).map((p) => ({ id: p.id, layer: l })))

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('explorer.layers')}</h3>
        <div className="flex gap-1 text-xs">
          <button className="rounded-lg px-2 py-1 text-ink-soft hover:bg-lavender-soft hover:text-lavender-ink" onClick={showAll}>
            {t('explorer.all')}
          </button>
          <button className="rounded-lg px-2 py-1 text-ink-soft hover:bg-lavender-soft hover:text-lavender-ink" onClick={hideAll}>
            {t('explorer.none')}
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5" role="list">
        {LAYERS.map((l) => {
          const Icon = LAYER_ICONS[l]
          const on = visible[l]
          return (
            <li key={l}>
              <button
                type="button"
                onClick={() => toggleLayer(l)}
                aria-pressed={on}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                  on ? 'border-line bg-white shadow-[0_6px_18px_-12px_rgba(43,52,69,0.35)]' : 'border-transparent bg-transparent opacity-70 hover:opacity-100 hover:bg-white/60'
                }`}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: on ? `color-mix(in srgb, ${LAYER_ACCENT[l]} 18%, white)` : '#F3F5F9', color: on ? LAYER_ACCENT[l] : '#9AA3B5' }}
                >
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{t(`layers.${l}.name`)}</span>
                  <span className="block truncate text-[11px] text-ink-faint">{t(`layers.${l}.desc`)}</span>
                </span>
                <span className="mono text-[10px] text-ink-faint">{counts[l] || '·'}</span>
                <span className="text-ink-faint group-hover:text-lavender-ink">{on ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="rounded-2xl border border-line bg-white/70 p-3">
        <label htmlFor="depth" className="flex items-center justify-between text-xs text-ink-soft">
          <span className="font-medium text-ink">{t('explorer.depth')}</span>
          <span className="mono text-[10px] text-ink-faint">{t(`layers.${LAYERS[depth]}.name`)}</span>
        </label>
        <input
          id="depth"
          type="range"
          min={0}
          max={LAYERS.length - 1}
          step={1}
          value={depth}
          onChange={(e) => setDepth(+e.target.value)}
          className="range mt-3"
          aria-describedby="depth-hint"
          aria-valuetext={t(`layers.${LAYERS[depth]}.name`)}
        />
        <p id="depth-hint" className="mt-2 text-[11px] leading-snug text-ink-faint">
          {t('explorer.depthHint')}
        </p>
      </div>

      <div className="min-h-0 flex-1 rounded-2xl border border-line bg-white/70">
        <button
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-ink"
          onClick={() => setIndexOpen((o) => !o)}
          aria-expanded={indexOpen}
          aria-controls="indice-estructuras"
        >
          <span>{t('explorer.index')}</span>
          <span className="flex items-center gap-2 mono text-[10px] text-ink-faint">
            {visibleIds.length}
            <ChevronDown size={16} className={`transition-transform ${indexOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {indexOpen && (
          <ul id="indice-estructuras" className="scroll-thin max-h-56 overflow-y-auto px-1.5 pb-2" role="list">
            {visibleIds.map(({ id, layer }) => (
              <li key={id}>
                <button
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
                    selected === id ? 'bg-lavender-soft text-lavender-ink' : 'text-ink-soft hover:bg-bone hover:text-ink'
                  }`}
                  onClick={() => {
                    select(id, layer)
                    onPicked?.()
                  }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: LAYER_ACCENT[layer] }} />
                  {content.structures[id]?.nombre ?? id}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
