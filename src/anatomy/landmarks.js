/**
 * Puntos de referencia anatómicos compartidos por todas las capas.
 * Medidas en metros para un adulto de ~1,75 m en posición anatómica
 * (brazos ligeramente separados, palmas hacia delante). Lado izquierdo del cuerpo = +x.
 */
import { Vector3 } from 'three'

const vec = (a) => new Vector3(...a)
const add = (a, ...terms) => {
  const r = vec(a)
  for (const [v, s] of terms) r.addScaledVector(v, s)
  return r.toArray()
}

export const L = {
  ankle: [0.09, 0.075, -0.005],
  knee: [0.095, 0.47, 0.0],
  hip: [0.088, 0.905, 0.02],
  shoulder: [0.185, 1.415, -0.005],
  elbow: [0.307, 1.141, -0.022],
  wrist: [0.424, 0.92, 0.006],
  sternumTop: [0, 1.41, 0.074],
  sternumBottom: [0, 1.215, 0.108],
  headCentre: [0, 1.655, -0.012],
}

// Ejes del brazo (para el lado +x)
export const ARM = (() => {
  const S = vec(L.shoulder), E = vec(L.elbow), W = vec(L.wrist)
  const Dua = E.clone().sub(S).normalize() // dirección del brazo
  const Dfa = W.clone().sub(E).normalize() // dirección del antebrazo
  const Z = new Vector3(0, 0, 1)
  // eje lateral (hacia fuera del cuerpo, lado del pulgar en posición anatómica)
  const latOf = (d) => new Vector3().crossVectors(Z, d).normalize()
  const Dh = new Vector3(0.4, -0.915, 0.035).normalize() // dirección de la mano
  return { Dua, Dfa, Dh, latUa: latOf(Dua), latFa: latOf(Dfa), latH: latOf(Dh), Z }
})()

/** Posición a lo largo del brazo (t=0 hombro, t=1 codo) con desplazamientos lateral/anterior. */
export const alongArm = (t, lat = 0, fwd = 0) => {
  const S = vec(L.shoulder), E = vec(L.elbow)
  return add(S.lerp(E, t).toArray(), [ARM.latUa, lat], [ARM.Z, fwd])
}
export const alongForearm = (t, lat = 0, fwd = 0) => {
  const E = vec(L.elbow), W = vec(L.wrist)
  return add(E.lerp(W, t).toArray(), [ARM.latFa, lat], [ARM.Z, fwd])
}
export const alongHand = (d, lat = 0, fwd = 0) => add(L.wrist, [ARM.Dh, d], [ARM.latH, lat], [ARM.Z, fwd])

/** Columna: curvatura sagital (z en función de y). */
const SPINE_PTS = [
  [1.575, -0.006],
  [1.555, -0.008],
  [1.51, -0.012],
  [1.465, -0.022],
  [1.4, -0.04],
  [1.32, -0.05],
  [1.24, -0.048],
  [1.165, -0.036],
  [1.09, -0.02],
  [1.03, -0.016],
  [0.99, -0.026],
  [0.95, -0.05],
]
export function spineZ(y) {
  const P = SPINE_PTS
  if (y >= P[0][0]) return P[0][1]
  if (y <= P[P.length - 1][0]) return P[P.length - 1][1]
  let i = 0
  while (i < P.length - 2 && y < P[i + 1][0]) i++
  const t = (P[i][0] - y) / (P[i][0] - P[i + 1][0])
  const g = (j) => P[Math.max(0, Math.min(P.length - 1, j))][1]
  const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2)
  const t2 = t * t, t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/** Altura (y) del centro de cada vértebra: C1–C7, T1–T12, L1–L5. */
export const VERTEBRAE = (() => {
  const list = []
  const seg = (name, n, y0, y1, r0, r1) => {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1)
      list.push({ name: `${name}${i + 1}`, group: name, y: y0 + (y1 - y0) * t, r: r0 + (r1 - r0) * t })
    }
  }
  seg('C', 7, 1.553, 1.468, 0.0085, 0.011)
  seg('T', 12, 1.448, 1.172, 0.0115, 0.0165)
  seg('L', 5, 1.146, 1.002, 0.018, 0.0215)
  for (let i = 0; i < list.length; i++) {
    const prev = list[i - 1]?.y ?? list[i].y + 0.012
    const next = list[i + 1]?.y ?? list[i].y - 0.03
    list[i].h = Math.abs(prev - next) * 0.5 * 0.72
    list[i].z = spineZ(list[i].y)
  }
  return list
})()

export const spinePoint = (y, back = 0) => [0, y, spineZ(y) - back]

/**
 * Perfil del tronco para la piel: [y, semiancho, semiprofundidad, centro z].
 * Lo usan también los músculos superficiales para quedar justo bajo la piel.
 */
export const TORSO_PROFILE = [
  [0.8, 0.075, 0.07, -0.005],
  [0.84, 0.15, 0.095, -0.01],
  [0.9, 0.168, 0.103, -0.012],
  [0.96, 0.166, 0.098, -0.008],
  [1.02, 0.16, 0.098, -0.006],
  [1.07, 0.15, 0.097, -0.002],
  [1.12, 0.145, 0.097, 0.002],
  [1.18, 0.151, 0.104, 0.004],
  [1.25, 0.16, 0.11, 0.006],
  [1.32, 0.165, 0.113, 0.004],
  [1.38, 0.168, 0.108, 0.0],
  [1.43, 0.165, 0.1, -0.005],
  [1.465, 0.115, 0.08, -0.01],
  [1.49, 0.07, 0.06, -0.01],
]

function crInterp(table, y, k) {
  const P = table
  if (y <= P[0][0]) return P[0][k]
  if (y >= P[P.length - 1][0]) return P[P.length - 1][k]
  let i = 0
  while (i < P.length - 2 && y > P[i + 1][0]) i++
  const t = (y - P[i][0]) / (P[i + 1][0] - P[i][0])
  const g = (j) => P[Math.max(0, Math.min(P.length - 1, j))][k]
  const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2)
  const t2 = t * t, t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/** Sección del tronco a la altura y: { a, b, cz }. */
export const torsoAt = (y) => ({ a: crInterp(TORSO_PROFILE, y, 1), b: crInterp(TORSO_PROFILE, y, 2), cz: crInterp(TORSO_PROFILE, y, 3) })

/**
 * Punto sobre (o bajo) la superficie del tronco.
 * angle: 0 = delante, π/2 = costado izquierdo (+x), π = espalda. inset: profundidad bajo la piel.
 */
export function torsoPoint(y, angle, inset = 0) {
  const { a, b, cz } = torsoAt(y)
  const x = Math.sin(angle) * a, z = Math.cos(angle) * b
  // normal aproximada de la elipse para desplazar hacia dentro
  const nx = x / (a * a), nz = z / (b * b)
  const l = Math.hypot(nx, nz) || 1
  return [x - (nx / l) * inset, y, cz + z - (nz / l) * inset]
}

/** Normal exterior aproximada del tronco en ese punto (para orientar músculos planos). */
export function torsoNormal(y, angle) {
  const { a, b } = torsoAt(y)
  const x = Math.sin(angle) * a, z = Math.cos(angle) * b
  const nx = x / (a * a), nz = z / (b * b)
  const l = Math.hypot(nx, nz) || 1
  return [nx / l, 0, nz / l]
}
