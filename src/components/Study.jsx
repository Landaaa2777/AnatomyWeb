import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { SectionHeader } from './Section.jsx'
import { Flashcards } from './Flashcards.jsx'
import { Quiz } from './Quiz.jsx'
import { CardsIcon, TargetIcon } from './icons.jsx'

export function Study() {
  const { t } = useI18n()
  const [tab, setTab] = useState('flashcards')
  const tabs = [
    ['flashcards', CardsIcon],
    ['quiz', TargetIcon],
  ]
  return (
    <section id="estudio" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t('study.eyebrow')} title={t('study.title')} subtitle={t('study.subtitle')} />
          <div className="flex w-fit gap-1 rounded-2xl glass p-1" role="tablist" aria-label={t('study.title')}>
            {tabs.map(([id, Icon]) => (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all ${
                  tab === id ? 'bg-white text-ink shadow-[0_6px_16px_-10px_rgba(43,52,69,0.4)]' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon size={17} /> {t(`study.tabs.${id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'flashcards' ? <Flashcards /> : <Quiz />}
        </div>
      </div>
    </section>
  )
}
