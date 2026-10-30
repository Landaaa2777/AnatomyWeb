/**
 * Ensambla el modelo anatómico capa por capa y lo serializa en buffers transferibles.
 */
import { buildSkeleton } from './skeleton.js'
import { buildOrgans } from './organs.js'
import { buildCirculatory } from './circulatory.js'
import { buildNervous } from './nervous.js'
import { buildMuscles } from './muscles.js'
import { buildSkin } from './skin.js'

export const LAYER_BUILDERS = {
  piel: buildSkin,
  musculos: buildMuscles,
  circulatorio: buildCirculatory,
  nervioso: buildNervous,
  organos: buildOrgans,
  esqueleto: buildSkeleton,
}

/**
 * Punto de anclaje para la etiqueta: vértice de la malla más cercano al centroide.
 * En estructuras simétricas se usa sólo la mitad +x (la etiqueta se puede reflejar al otro lado).
 */
function anchorOf(positions) {
  let cx = 0, cy = 0, cz = 0, n = 0
  let minX = Infinity, maxX = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i] < minX) minX = positions[i]
    if (positions[i] > maxX) maxX = positions[i]
  }
  const hasRight = minX < -0.02 && maxX > 0.02 && Math.abs(minX + maxX) < 0.03
  for (let i = 0; i < positions.length; i += 3) {
    if (hasRight && positions[i] < 0.005) continue
    cx += positions[i]; cy += positions[i + 1]; cz += positions[i + 2]; n++
  }
  cx /= n; cy /= n; cz /= n
  let best = 0, bd = Infinity
  for (let i = 0; i < positions.length; i += 3) {
    if (hasRight && positions[i] < 0.005) continue
    // favorece vértices de la cara anterior para que la etiqueta no quede oculta
    const d = (positions[i] - cx) ** 2 + (positions[i + 1] - cy) ** 2 + (positions[i + 2] - cz) ** 2 - positions[i + 2] * 0.002
    if (d < bd) { bd = d; best = i }
  }
  return [positions[best], positions[best + 1], positions[best + 2]]
}

/** Genera un trabajo: una capa completa ('organos') o una parte de una capa ('esqueleto:axial'). */
export function buildLayer(job, progress) {
  const [layer, subset] = job.split(':')
  const parts = LAYER_BUILDERS[layer](progress, subset)
  return parts.map((p) => {
    const g = p.mesh.build()
    return { id: p.id, layer: p.layer, positions: g.positions, normals: g.normals, indices: g.indices, ao: g.ao, anchor: p.anchor ?? anchorOf(g.positions) }
  })
}
