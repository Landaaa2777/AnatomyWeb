import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n/index.jsx'
import { LogoMark, MenuIcon, CloseIcon, ArrowRight } from './icons.jsx'

const LINKS = [
  ['explorar', 'nav.explore'],
  ['sistemas', 'nav.systems'],
  ['estudio', 'nav.study'],
  ['tests', 'nav.tests'],
  ['glosario', 'nav.glossary'],
]

export function Navbar() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // resalta la sección visible
  useEffect(() => {
    const els = LINKS.map(([id]) => document.getElementById(id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 btn btn-ghost">
        {t('nav.skip')}
      </a>
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-3 py-2 transition-all duration-300 ${
          scrolled ? 'glass-strong' : 'bg-transparent'
        }`}
        aria-label="Principal"
      >
        <a href="#inicio" className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <LogoMark size={34} />
          <span className="font-semibold tracking-tight text-ink">{t('nav.brand')}</span>
        </a>
        <ul className="hidden md:flex items-center gap-1">
          {LINKS.map(([id, key]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`relative rounded-xl px-3.5 py-2 text-sm transition-colors ${active === id ? 'text-lavender-ink' : 'text-ink-soft hover:text-ink'}`}
                aria-current={active === id ? 'true' : undefined}
              >
                {t(key)}
                {active === id && <motion.span layoutId="nav-dot" className="absolute left-1/2 -bottom-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-lavender" />}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a href="#explorar" className="btn btn-primary hidden sm:inline-flex !py-2 !px-4 text-sm">
            {t('nav.cta')} <ArrowRight size={16} />
          </a>
          <button className="icon-btn md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-movil" aria-label={open ? t('nav.close') : t('nav.menu')}>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-movil"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden mx-auto mt-2 max-w-7xl rounded-2xl glass-strong p-2"
          >
            {LINKS.map(([id, key]) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-ink hover:bg-lavender-soft">
                {t(key)}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
