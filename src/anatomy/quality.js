/** Niveles de detalle del modelo procedural. */
export const QUALITY_PRESETS = {
  high: { res: 1.15, tube: 0.9, dpr: 1.75 },
  low: { res: 1.5, tube: 0.65, dpr: 1.25 },
}

/** Calidad baja en móviles, pantallas pequeñas o equipos con pocos núcleos. */
export function detectQuality() {
  if (typeof window === 'undefined') return 'high'
  try {
    // forzar con ?calidad=alta|baja
    const forced = new URLSearchParams(window.location.search).get('calidad')
    if (forced === 'baja') return 'low'
    if (forced === 'alta') return 'high'
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const cores = navigator.hardwareConcurrency || 4
    const small = Math.min(window.screen?.width || 1920, window.screen?.height || 1080) < 700
    return coarse || small || cores <= 4 ? 'low' : 'high'
  } catch {
    return 'high'
  }
}

export const QUALITY = detectQuality()
