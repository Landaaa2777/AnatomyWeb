/**
 * Colores del modelo: tonos claros, con acentos rosa/coral, celeste y lavanda.
 * base = color del cuerpo del material, rim = brillo de borde (efecto fresnel).
 */
export const LAYER_STYLE = {
  piel: { base: '#F5F9FF', rim: '#7DBDF7', opacity: 0.05, rimOpacity: 0.5, power: 2.2, order: 9 },
  musculos: { base: '#FFC2CC', rim: '#F2617F', opacity: 0.5, rimOpacity: 0.88, power: 1.7, order: 5 },
  circulatorio: { base: '#FF9DB0', rim: '#E8486D', opacity: 0.92, rimOpacity: 1, power: 1.6, order: 3 },
  nervioso: { base: '#E3D9FF', rim: '#8A6FF0', opacity: 0.9, rimOpacity: 1, power: 1.7, order: 3 },
  organos: { base: '#FFD0C2', rim: '#EE8F7A', opacity: 0.86, rimOpacity: 0.98, power: 1.8, order: 2 },
  esqueleto: { base: '#F1F4FA', rim: '#93B2E0', opacity: 0.96, rimOpacity: 1, power: 2.0, order: 1 },
}

const ARTERY = { base: '#FF94A8', rim: '#E5446B' }
const VEIN = { base: '#A6CFFF', rim: '#4F8FE6' }

export const PART_STYLE = {
  corazon: { base: '#FF9FB3', rim: '#E04A70' },
  aorta: ARTERY,
  carotidas: ARTERY,
  'arterias-brazo': ARTERY,
  'arterias-pierna': ARTERY,
  'tronco-pulmonar': { base: '#B9C8FF', rim: '#6A7FE8' },
  'vena-cava': VEIN,
  yugulares: VEIN,
  'venas-brazo': VEIN,
  'venas-pierna': VEIN,
  cerebro: { base: '#F4ECFF', rim: '#A88BF6' },
  cerebelo: { base: '#EDE3FF', rim: '#9479F2' },
  'tronco-encefalico': { base: '#E8DEFF', rim: '#8C70EF' },
  ojos: { base: '#D6EEFF', rim: '#5FA8EE' },
  pulmones: { base: '#FFD3DC', rim: '#F08EA8' },
  traquea: { base: '#DDEEFF', rim: '#7FB4EC' },
  esofago: { base: '#FFD0C8', rim: '#EA8F86' },
  estomago: { base: '#FFD7C4', rim: '#EE9C7C' },
  higado: { base: '#F8BBA6', rim: '#DB7E62' },
  vesicula: { base: '#D7F0C2', rim: '#86BE63' },
  pancreas: { base: '#FFE6B0', rim: '#E8B04F' },
  bazo: { base: '#F1B5D0', rim: '#CF6C9E' },
  'intestino-delgado': { base: '#FFDCCB', rim: '#F0A487' },
  'intestino-grueso': { base: '#FFD1BA', rim: '#E69676' },
  rinones: { base: '#F9B4B8', rim: '#DE7280' },
  vejiga: { base: '#FFE9B8', rim: '#E9B558' },
  tiroides: { base: '#FFC5DA', rim: '#EB79A3' },
}

export function styleFor(part) {
  const layer = LAYER_STYLE[part.layer]
  return { ...layer, ...PART_STYLE[part.id] }
}

/** Color de acento de cada capa en la interfaz. */
export const LAYER_ACCENT = {
  piel: '#8EC9FF',
  musculos: '#FF8FA3',
  circulatorio: '#F2647F',
  nervioso: '#B9A6FF',
  organos: '#F5A08A',
  esqueleto: '#8EB4E8',
}
