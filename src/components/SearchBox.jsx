import { useId, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { useModel } from '../anatomy/loader.js'
import { LAYER_ACCENT } from '../three/palette.js'
import { SearchIcon, CloseIcon } from './icons.jsx'

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Buscador accesible (combobox) de estructuras anatómicas. */
export function SearchBox({ onSelect, className = '' }) {
  const { t, content } = useI18n()
  const byId = useModel((s) => s.byId)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listId = useId()

  const results = useMemo(() => {
    const nq = norm(q.trim())
    if (!nq) return []
    return Object.entries(content.structures)
      .map(([id, s]) => {
        const n = norm(s.nombre), l = norm(s.latin)
        const score = n.startsWith(nq) ? 0 : n.includes(nq) ? 1 : l.includes(nq) ? 2 : norm(s.funcion).includes(nq) ? 3 : 9
        return { id, s, score }
      })
      .filter((r) => r.score < 9)
      .sort((a, b) => a.score - b.score || a.s.nombre.localeCompare(b.s.nombre))
      .slice(0, 8)
  }, [q, content])

  const choose = (r) => {
    if (!r) return
    onSelect(r.id, byId[r.id]?.layer)
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-2xl glass-strong px-3 py-2">
        <SearchIcon size={18} className="text-ink-faint" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          aria-label={t('explorer.search')}
          placeholder={t('explorer.search')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              choose(results[active])
            } else if (e.key === 'Escape') {
              setQ('')
              setOpen(false)
            }
          }}
          className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button className="text-ink-faint hover:text-ink" onClick={() => setQ('')} aria-label="Borrar búsqueda">
            <CloseIcon size={16} />
          </button>
        )}
      </div>
      {open && q.trim() && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl glass-strong p-1.5">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-faint">{t('explorer.noResults')}</li>}
          {results.map((r, i) => {
            const layer = byId[r.id]?.layer
            return (
              <li
                key={r.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(r)
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${i === active ? 'bg-lavender-soft' : ''}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LAYER_ACCENT[layer] || '#ccc' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{r.s.nombre}</span>
                  <span className="block truncate text-[11px] italic text-ink-faint">{r.s.latin}</span>
                </span>
                {layer && <span className="mono text-[10px] uppercase text-ink-faint">{t(`layers.${layer}.name`)}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
