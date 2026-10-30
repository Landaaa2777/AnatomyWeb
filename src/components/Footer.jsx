import { useI18n } from '../i18n/index.jsx'
import { LogoMark } from './icons.jsx'

export function Footer() {
  const { t, locale, setLocale, locales } = useI18n()
  return (
    <footer className="relative mt-10 border-t border-line bg-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <a href="#inicio" className="flex w-fit items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-semibold text-ink">{t('nav.brand')}</span>
          </a>
          <p className="max-w-sm text-sm text-ink-soft">{t('footer.tagline')}</p>
          <p className="max-w-sm text-xs leading-relaxed text-ink-faint">{t('footer.note')}</p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-col gap-2 text-sm">
          {[
            ['explorar', 'nav.explore'],
            ['sistemas', 'nav.systems'],
            ['estudio', 'nav.study'],
            ['glosario', 'nav.glossary'],
          ].map(([id, key]) => (
            <a key={id} href={`#${id}`} className="w-fit text-ink-soft hover:text-lavender-ink">
              {t(key)}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <label htmlFor="lang" className="mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            {t('footer.language')}
          </label>
          <select
            id="lang"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-fit rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="mt-auto text-xs text-ink-faint">{t('footer.made')}</p>
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-sky via-lavender to-coral opacity-70" />
    </footer>
  )
}
