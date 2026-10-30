import { motion } from 'framer-motion'

/** Cabecera de sección con aparición suave al hacer scroll. */
export function SectionHeader({ eyebrow, title, subtitle, align = 'left', children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex flex-col gap-3 ${align === 'center' ? 'items-center text-center mx-auto' : ''} max-w-2xl`}
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.1] text-ink">{title}</h2>
      {subtitle && <p className="text-ink-soft text-base sm:text-lg leading-relaxed">{subtitle}</p>}
      {children}
    </motion.div>
  )
}

export function Reveal({ children, delay = 0, className = '', y = 20 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
