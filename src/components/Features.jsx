import { useMemo } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { buildQuestionBank } from '../lib/questionBank.js'
import { Reveal } from './Section.jsx'
import { LayersIcon, BookIcon, TargetIcon, CardsIcon, ArrowRight } from './icons.jsx'

const ICONS = [LayersIcon, BookIcon, TargetIcon, CardsIcon]
const TINTS = ['#8EC9FF', '#B9A6FF', '#FF8FA3', '#9FE3E8']

/** Franja de funcionalidades bajo la portada. */
export function Features() {
  const { t, content } = useI18n()
  const nQ = useMemo(() => buildQuestionBank(content).length, [content])
  const nS = Object.keys(content.structures).length
  const items = t('features.items')
  return (
    <section aria-label="Funcionalidades" className="relative border-y border-line bg-white/60">
      <ul className="mx-auto grid max-w-7xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => {
          const Icon = ICONS[i]
          return (
            <li key={it.href + i} className="bg-white/90">
              <Reveal delay={i * 0.06} className="h-full">
                <a href={it.href} className="group flex h-full flex-col gap-3 px-6 py-8 transition-colors hover:bg-bone sm:px-8">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${TINTS[i]} 20%, white)`, color: `color-mix(in srgb, ${TINTS[i]} 70%, #2B3445)` }}>
                    <Icon size={20} />
                  </span>
                  <h3 className="font-semibold text-ink">{it.title.replace('{n}', nS).replace('{q}', nQ)}</h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{it.text}</p>
                  <ArrowRight size={16} className="mt-auto text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-lavender-ink" />
                </a>
              </Reveal>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
