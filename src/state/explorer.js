/** Estado del explorador 3D (compartido entre la barra, el panel de capas, la ficha y el visor). */
import { create } from 'zustand'

/** Capas de fuera hacia dentro (orden del control de profundidad). */
export const LAYERS = ['piel', 'musculos', 'circulatorio', 'nervioso', 'organos', 'esqueleto']

export const DEFAULT_VISIBLE = {
  piel: true,
  musculos: false,
  circulatorio: true,
  nervioso: false,
  organos: true,
  esqueleto: true,
}

/** Etiquetas destacadas por capa (se muestran con el interruptor "Etiquetas"). */
export const KEY_LABELS = {
  esqueleto: ['craneo', 'clavicula', 'costillas', 'humero', 'pelvis', 'femur', 'tibia'],
  organos: ['pulmones', 'higado', 'estomago', 'intestino-delgado', 'intestino-grueso', 'vejiga'],
  circulatorio: ['corazon', 'aorta', 'carotidas', 'vena-cava', 'arterias-pierna'],
  nervioso: ['cerebro', 'medula-espinal', 'nervios-brazo', 'nervio-ciatico'],
  musculos: ['deltoides', 'pectoral-mayor', 'biceps', 'recto-abdominal', 'cuadriceps', 'sartorio'],
  piel: ['piel'],
}

/** Elige hasta `max` etiquetas repartidas entre las capas visibles (las internas primero). */
export function labelsFor(visible, max = 14) {
  const order = [...LAYERS].reverse().filter((l) => visible[l] && l !== 'piel')
  if (!order.length) return visible.piel ? ['piel'] : []
  const out = []
  let round = 0
  while (out.length < max && round < 8) {
    let added = false
    for (const l of order) {
      const id = KEY_LABELS[l][round]
      if (id && out.length < max) {
        out.push(id)
        added = true
      }
    }
    if (!added) break
    round++
  }
  return out
}

export const useExplorer = create((set, get) => ({
  visible: { ...DEFAULT_VISIBLE },
  selected: null,
  hovered: null,
  isolated: false,
  labels: true,
  halfSkin: false,
  view: 'full',
  resetSignal: 0,

  toggleLayer: (layer) => set((s) => ({ visible: { ...s.visible, [layer]: !s.visible[layer] } })),
  setVisible: (visible) => set({ visible }),
  showAll: () => set({ visible: Object.fromEntries(LAYERS.map((l) => [l, true])) }),
  hideAll: () => set({ visible: Object.fromEntries(LAYERS.map((l) => [l, false])) }),
  /** Profundidad d: se retiran las d capas más externas. */
  setDepth: (d) => set({ visible: Object.fromEntries(LAYERS.map((l, i) => [l, i >= d])) }),
  select: (id, layer) =>
    set((s) => ({
      selected: id,
      isolated: id ? s.isolated && s.selected === id : false,
      visible: id && layer && !s.visible[layer] ? { ...s.visible, [layer]: true } : s.visible,
    })),
  setHovered: (id) => (get().hovered !== id ? set({ hovered: id }) : null),
  toggleIsolate: () => set((s) => ({ isolated: !s.isolated })),
  toggleLabels: () => set((s) => ({ labels: !s.labels })),
  toggleHalfSkin: () => set((s) => ({ halfSkin: !s.halfSkin, visible: s.halfSkin ? s.visible : { ...s.visible, piel: true } })),
  setView: (view) => set((s) => ({ view, selected: null, isolated: false, resetSignal: s.resetSignal + 1 })),
  reset: () => set((s) => ({ selected: null, isolated: false, halfSkin: false, view: 'full', visible: { ...DEFAULT_VISIBLE }, resetSignal: s.resetSignal + 1 })),
}))
