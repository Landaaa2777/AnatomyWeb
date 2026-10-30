import { useEffect, useRef, useState } from 'react'

export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    on()
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [query])
  return matches
}

/** true mientras el elemento está cerca del viewport (para montar/desmontar lienzos WebGL). */
export function useNearViewport(margin = '300px') {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, near]
}

/** Almacenamiento local tolerante a fallos (modo privado, cookies bloqueadas…). */
export const storage = {
  get(key, fallback = null) {
    try {
      const v = window.localStorage.getItem(key)
      return v == null ? fallback : JSON.parse(v)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* sin almacenamiento */
    }
  },
}

export function shuffle(arr, seed = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seed() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
