/**
 * Articulaciones de manos y pies (lado +x). Las comparten huesos, piel, vasos y nervios
 * para que todas las capas encajen entre sí.
 */
import { Vector3 } from 'three'
import { ARM, alongHand } from './landmarks.js'

const P = (v) => v.toArray()

/** Dedos de la mano: cada dedo es una lista de puntos [base, nudillo, IFP, IFD, punta]. */
export const HAND = (() => {
  const { Dh, latH, Z } = ARM
  const fingers = []
  const base = [0.011, 0.003, -0.005, -0.012]
  const knuckle = [0.02, 0.003, -0.013, -0.027]
  const metaLen = [0.064, 0.062, 0.056, 0.051]
  const spread = [0.1, 0.0, -0.1, -0.21]
  const lens = [
    [0.04, 0.024, 0.018],
    [0.045, 0.028, 0.02],
    [0.042, 0.026, 0.019],
    [0.033, 0.019, 0.017],
  ]
  const curl = [0.1, 0.24, 0.34]
  for (let i = 0; i < 4; i++) {
    const pts = [alongHand(0.034, base[i], 0.002), alongHand(0.034 + metaLen[i], knuckle[i], 0.004)]
    let p = new Vector3(...pts[1])
    for (let k = 0; k < 3; k++) {
      const d = Dh.clone().addScaledVector(latH, spread[i]).addScaledVector(Z, curl[k]).normalize()
      p = p.clone().addScaledVector(d, lens[i][k])
      pts.push(P(p))
    }
    fingers.push(pts)
  }
  // Pulgar: base del metacarpiano, cabeza, falange proximal, punta
  const t0 = new Vector3(...alongHand(0.022, 0.02, 0.006))
  const d1 = Dh.clone().multiplyScalar(0.55).addScaledVector(latH, 0.62).addScaledVector(Z, 0.55).normalize()
  const t1 = t0.clone().addScaledVector(d1, 0.042)
  const d2 = d1.clone().addScaledVector(Dh, 0.45).addScaledVector(Z, 0.1).normalize()
  const t2 = t1.clone().addScaledVector(d2, 0.031)
  const d3 = d2.clone().addScaledVector(Dh, 0.3).addScaledVector(Z, 0.15).normalize()
  const t3 = t2.clone().addScaledVector(d3, 0.024)
  const thumb = [P(t0), P(t1), P(t2), P(t3)]
  const carpals = []
  for (const [d, lats] of [
    [0.012, [0.014, 0.004, -0.006, -0.015]],
    [0.026, [0.016, 0.006, -0.004, -0.014]],
  ])
    for (const l of lats) carpals.push(alongHand(d, l, 0.001))
  return { fingers, thumb, carpals }
})()

/** Pie: marco local (talón, adelante, lateral, arriba). */
export const FOOT = (() => {
  const yaw = 0.14
  const H = new Vector3(0.088, 0.0, -0.06)
  const F = new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
  const Lf = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  const U = new Vector3(0, 1, 0)
  const fp = (f, l, u) => P(H.clone().addScaledVector(F, f).addScaledVector(Lf, l).addScaledVector(U, u))
  const lb = [-0.02, -0.009, 0.001, 0.011, 0.02]
  const lh = [-0.026, -0.011, 0.0, 0.011, 0.021]
  const len = [0.062, 0.07, 0.066, 0.062, 0.056]
  const ub = [0.035, 0.036, 0.032, 0.027, 0.022]
  const phal = [
    [0.03, 0.022],
    [0.024, 0.013, 0.011],
    [0.021, 0.012, 0.01],
    [0.019, 0.011, 0.009],
    [0.016, 0.01, 0.009],
  ]
  const toes = []
  for (let i = 0; i < 5; i++) {
    const pts = [fp(0.118, lb[i], ub[i]), fp(0.118 + len[i], lh[i], 0.013)]
    let f = 0.118 + len[i], u = 0.013
    const splay = (i - 1.5) * 0.004
    let l = lh[i]
    for (const pl of phal[i]) {
      f += pl
      u = Math.max(0.006, u - pl * 0.18)
      l += splay
      pts.push(fp(f, l, u))
    }
    toes.push(pts)
  }
  return { fp, toes, F, Lf }
})()
