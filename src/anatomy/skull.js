/**
 * Cráneo y mandíbula anatómicos.
 *
 * Proporciones de un adulto (longitud del cráneo ≈ 19 cm, anchura ≈ 15 cm, órbitas ≈ 3,7 × 3,3 cm,
 * abertura nasal en forma de pera, arcos cigomáticos y 32 dientes en oclusión).
 * Todo se modela con SDF; los dientes se generan aparte con más resolución.
 */
import { MeshBuilder } from './mesh.js'
import * as S from './sdf.js'

const sdfMesh = (f, bounds, res) => new MeshBuilder().addRaw(S.polygonize(f, bounds, res))

/* -------------------------------- arcadas dentales -------------------------------- */

// [anchura mesiodistal, grosor vestíbulo-lingual, altura de corona, tipo]
const TEETH = [
  [0.0086, 0.0068, 0.0105, 'incisivo'],
  [0.0066, 0.006, 0.0095, 'incisivo'],
  [0.0076, 0.0078, 0.011, 'canino'],
  [0.007, 0.0086, 0.0085, 'premolar'],
  [0.0066, 0.0086, 0.008, 'premolar'],
  [0.0102, 0.0108, 0.0075, 'molar'],
  [0.0092, 0.0104, 0.007, 'molar'],
  [0.0086, 0.0098, 0.0065, 'molar'],
]
const UPPER = { z0: 0.083, k: 55 }
const LOWER = { z0: 0.0765, k: 58 }
const OCCLUSAL = 1.5545

/** Punto, tangente y normal (vestibular) de la arcada parabólica z = z0 − k·x² a una longitud de arco s. */
function archAt({ z0, k }, s) {
  // integración numérica de la longitud de arco
  let x = 0, acc = 0
  const dx = 0.0002
  while (acc < s) {
    const slope = 2 * k * (x + dx / 2)
    acc += dx * Math.sqrt(1 + slope * slope)
    x += dx
  }
  const slope = 2 * k * x
  const l = Math.sqrt(1 + slope * slope)
  return { p: [x, 0, z0 - k * x * x], t: [1 / l, 0, -slope / l], n: [slope / l, 0, 1 / l] }
}

/** Centros de los dientes de media arcada (lado +x). */
function archTeeth(arch) {
  const out = []
  let s = 0
  TEETH.forEach(([w, th, h, kind], i) => {
    const a = archAt(arch, s + w / 2)
    s += w + 0.0003
    out.push({ ...a, w, th, h, kind, i })
  })
  return out
}

/** SDF de una corona dental en su marco local (t: tangente, y: vertical, n: vestibular). */
function toothSDF(tooth, upper) {
  const { p, t, n, w, th, h, kind, i } = tooth
  // borde incisal / cara oclusal: los incisivos superiores solapan por delante de los inferiores
  const edge = upper ? (i < 2 ? OCCLUSAL - 0.002 : i === 2 ? OCCLUSAL - 0.0015 : OCCLUSAL) : i < 2 ? OCCLUSAL + 0.001 : i === 2 ? OCCLUSAL + 0.0015 : OCCLUSAL
  const cy = upper ? edge + h / 2 : edge - h / 2
  const c = [p[0] - n[0] * th / 2, cy, p[2] - n[2] * th / 2]
  const sgn = upper ? -1 : 1 // hacia el borde libre
  const local = (x, y, z) => {
    const dx = x - c[0], dy = y - c[1], dz = z - c[2]
    return [dx * t[0] + dz * t[2], dy, dx * n[0] + dz * n[2]]
  }
  let f
  if (kind === 'incisivo') {
    f = (x, y, z) => {
      const [lx, ly, lz] = local(x, y, z)
      const q = Math.min(1, Math.max(0, 0.5 - (sgn * ly) / h)) // 0 en el borde, 1 en el cuello
      const hz = (th / 2) * (0.45 + 0.55 * q)
      return S.boxDist(lx, ly, lz, w / 2, h / 2, hz, Math.min(hz, 0.0018))
    }
  } else if (kind === 'canino') {
    const neck = [c[0], cy - (sgn * h) / 2, c[2]]
    const tip = [c[0], cy + (sgn * h) / 2, c[2]]
    f = S.roundCone(neck, tip, th / 2, 0.0013)
  } else {
    const cusps = []
    const nc = kind === 'molar' ? 2 : 1
    for (let a = 0; a < nc; a++)
      for (const b of [-1, 1]) {
        const off = nc === 2 ? (a === 0 ? -w / 4 : w / 4) : 0
        const lp = [off, (sgn * h) / 2 - sgn * 0.0006, (b * th) / 4]
        cusps.push([c[0] + t[0] * lp[0] + n[0] * lp[2], c[1] + lp[1], c[2] + t[2] * lp[0] + n[2] * lp[2]])
      }
    const body = (x, y, z) => {
      const [lx, ly, lz] = local(x, y, z)
      return S.boxDist(lx, ly, lz, w / 2 - 0.0002, h / 2 - 0.0008, th / 2, 0.0024)
    }
    f = S.smooth(0.0015, body, ...cusps.map((cp) => S.sphere(cp, 0.0021)))
  }
  const r = Math.max(w, th, h)
  return S.bound(f, { min: [c[0] - r, c[1] - r, c[2] - r], max: [c[0] + r, c[1] + r, c[2] + r] }, 0.004)
}

export function teethMesh(upper) {
  const half = archTeeth(upper ? UPPER : LOWER).map((tt) => toothSDF(tt, upper))
  const f = S.mirrorX(S.union(...half))
  const y0 = upper ? OCCLUSAL - 0.004 : OCCLUSAL - 0.014
  return sdfMesh(f, { min: [-0.038, y0, 0.015], max: [0.038, y0 + 0.018, 0.09] }, 0.0011)
}

/** Hueso alveolar: cajas encadenadas a lo largo de la arcada, por fuera de las raíces. */
function alveolar(arch, yc, halfH, halfT, inset, extra = []) {
  const pts = []
  for (let s = 0; s <= 0.07; s += 0.01) {
    const a = archAt(arch, s)
    pts.push([a.p[0] - a.n[0] * inset, yc, a.p[2] - a.n[2] * inset])
  }
  pts.push(...extra)
  const segs = []
  for (let i = 0; i < pts.length - 1; i++) segs.push(S.segBox(pts[i], pts[i + 1], halfH, halfT, Math.min(halfT, 0.004)))
  return { f: S.union(...segs), pts }
}

/* ------------------------------------- cráneo ------------------------------------- */

/** Volumen exterior del cráneo (sin cavidades). La piel de la cabeza lo envuelve. */
export function skullOuter({ simple = false, vaultOnly = false } = {}) {
  const vault = S.smooth(
    0.025,
    S.ellipsoid([0, 1.664, -0.012], [0.07, 0.08, 0.096]),
    S.mirrorX(S.ellipsoid([0.03, 1.682, -0.03], [0.046, 0.054, 0.066])),
    S.mirrorX(S.ellipsoid([0.045, 1.63, -0.005], [0.03, 0.03, 0.05])),
    S.ellipsoid([0, 1.645, -0.068], [0.052, 0.045, 0.045]),
  )
  if (vaultOnly) return vault
  const upperFace = S.roundBox([0, 1.628, 0.056], [0.051, 0.026, 0.026], 0.02)
  const brow = S.mirrorX(S.capsule([0.006, 1.655, 0.084], [0.044, 1.653, 0.074], 0.0075))
  const cheek = S.mirrorX(
    S.union(
      S.ellipsoid([0.051, 1.612, 0.054], [0.016, 0.017, 0.018]),
      S.chain(
        [
          [0.062, 1.609, 0.045],
          [0.067, 1.612, 0.0],
          [0.064, 1.615, -0.017],
        ],
        [0.0048, 0.0046, 0.005],
      ),
      S.capsule([0.052, 1.62, 0.06], [0.05, 1.652, 0.066], 0.006),
      S.ellipsoid([0.053, 1.598, -0.04], [0.0055, 0.01, 0.0075]),
    ),
  )
  const maxilla = S.ellipsoid([0, 1.59, 0.06], [0.035, 0.027, 0.028])
  const nasal = S.mirrorX(S.capsule([0.003, 1.649, 0.083], [0.004, 1.617, 0.094], 0.0045))
  const face = S.smooth(0.034, vault, upperFace, maxilla)
  // versión simplificada (para la piel): sin arcada alveolar
  if (simple) return S.smooth(0.012, face, brow, cheek, nasal)
  const alv = S.bound(alveolar(UPPER, 1.5685, 0.0072, 0.0056, 0.003).f, { min: [-0.042, 1.555, 0.0], max: [0.042, 1.582, 0.095] })
  return S.smooth(0.012, face, brow, S.mirrorX(alv), cheek, nasal)
}

function skullFull() {
  let f = skullOuter()
  // fosa temporal (sienes) por detrás del reborde orbitario
  f = S.subtract(0.014, f, S.mirrorX(S.ellipsoid([0.083, 1.648, 0.038], [0.02, 0.03, 0.035])))
  // cavidad craneal (limitada por delante para dejar el techo de las órbitas)
  const cavity = S.union(
    S.ellipsoid([0, 1.668, -0.014], [0.063, 0.071, 0.088]),
    S.mirrorX(S.ellipsoid([0.03, 1.684, -0.03], [0.039, 0.047, 0.059])),
    S.mirrorX(S.ellipsoid([0.045, 1.63, -0.004], [0.022, 0.022, 0.042])),
  )
  f = S.subtract(0.004, f, (x, y, z) => Math.max(cavity(x, y, z), Math.min(1.652 - y, z - 0.02)))
  // órbitas: rectángulos redondeados algo inclinados, más profundas hacia el canal óptico
  const orbit = S.smooth(
    0.01,
    S.roundBox([0.0335, 1.633, 0.084], [0.0192, 0.0172, 0.03], 0.012, [0, 0, -0.1]),
    S.roundCone([0.0335, 1.633, 0.07], [0.026, 1.63, 0.036], 0.017, 0.008),
  )
  f = S.subtract(0.0025, f, S.bound(S.mirrorX(orbit), { min: [-0.06, 1.6, 0.0], max: [0.06, 1.665, 0.13] }))
  // abertura nasal piriforme
  const pear = (x, y, z) => {
    const a = Math.hypot(x, y - 1.59) - 0.0115
    const b = Math.hypot(x, y - 1.607) - 0.007
    const h = Math.max(0.012 - Math.abs(a - b), 0) / 0.012
    return Math.max(Math.min(a, b) - h * h * 0.003, 0.03 - z)
  }
  f = S.subtract(0.003, f, pear)
  f = S.smooth(0.002, f, S.capsule([0, 1.5805, 0.083], [0, 1.5795, 0.092], 0.0024)) // espina nasal
  // agujero magno, conducto auditivo y agujeros infraorbitarios
  f = S.subtract(0.003, f, S.capsule([0, 1.565, -0.026], [0, 1.6, -0.024], 0.0135))
  f = S.subtract(0.002, f, S.mirrorX(S.capsule([0.058, 1.614, -0.03], [0.09, 1.614, -0.03], 0.0045)))
  f = S.subtract(0.0015, f, S.mirrorX(S.capsule([0.026, 1.612, 0.066], [0.026, 1.613, 0.1], 0.0019)))
  // cóndilos occipitales
  f = S.smooth(0.004, f, S.mirrorX(S.ellipsoid([0.014, 1.579, -0.012], [0.006, 0.005, 0.009])))
  return f
}

export function buildSkull() {
  const mb = sdfMesh(skullFull(), { min: [-0.085, 1.55, -0.12], max: [0.085, 1.752, 0.1] }, 0.0028)
  mb.merge(teethMesh(true))
  return mb
}

/* ------------------------------------ mandíbula ------------------------------------ */

/** Sólido barrido a lo largo de una polilínea en el plano xz con perfil de estadio variable. */
function sweptArch(pts, profile) {
  const segs = []
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    segs.push({ ax, az, dx: bx - ax, dz: bz - az, len, start: total })
    total += len
  }
  return (x, y, z) => {
    let best = Infinity, T = 0
    for (const s of segs) {
      let t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / (s.len * s.len)
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const ex = s.ax + s.dx * t - x, ez = s.az + s.dz * t - z
      const d2 = ex * ex + ez * ez
      if (d2 < best) {
        best = d2
        T = (s.start + t * s.len) / total
      }
    }
    const { yc, halfH, halfT } = profile(T)
    const r = halfT * 0.95
    const qx = Math.sqrt(best) - halfT + r, qy = Math.abs(y - yc) - halfH + r
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  }
}

function mandibleParts() {
  // cuerpo: sigue la arcada inferior por fuera de las raíces y continúa hasta el ángulo (gonion)
  const xs = [0, 0.006, 0.012, 0.018, 0.023, 0.027, 0.031]
  const pts = xs.map((x) => {
    const z = LOWER.z0 - LOWER.k * x * x
    const slope = 2 * LOWER.k * x
    const l = Math.sqrt(1 + slope * slope)
    return [x - (slope / l) * 0.0038, z - (1 / l) * 0.0038]
  })
  pts.push([0.036, 0.014], [0.042, 0.01], [0.0462, 0.007])
  const body = sweptArch(pts, (t) => {
    const top = 1.546 + 0.0006 * t
    const bottom = 1.5172 + 0.011 * Math.pow(t, 1.3)
    return { yc: (top + bottom) / 2, halfH: (top - bottom) / 2, halfT: 0.0056 - 0.0021 * t }
  })
  // rama: placa entre el ángulo, la apófisis coronoides y el cóndilo
  // rama: contorno continuo (borde anterior → coronoides → escotadura → cóndilo → borde posterior →
  // ángulo redondeado) rellenado en abanico; el ángulo mandibular queda obtuso (~120°)
  const outline = [
    [0.0438, 1.549, 0.019],
    [0.0452, 1.576, 0.017],
    [0.047, 1.598, 0.013],
    [0.049, 1.586, 0.004],
    [0.0495, 1.584, -0.002],
    [0.051, 1.594, -0.011],
    [0.052, 1.6, -0.0145],
    [0.0508, 1.579, -0.0142],
    [0.0494, 1.557, -0.0102],
    [0.048, 1.541, -0.0035],
    [0.0468, 1.533, 0.0045],
    [0.0455, 1.529, 0.015],
    [0.0425, 1.526, 0.027],
  ]
  const C = [0.0478, 1.56, 0.004]
  const fan = []
  for (let i = 0; i < outline.length - 1; i++) fan.push(S.triangle(C, outline[i], outline[i + 1], 0.0026))
  const posterior = S.chain(outline.slice(5), [0.0036, 0.0036, 0.0042, 0.0044, 0.0046, 0.0046, 0.0044, 0.004])
  const anterior = S.chain(outline.slice(0, 5), [0.003, 0.0028, 0.0026, 0.0026, 0.0028])
  const ramus = S.smooth(0.004, ...fan, posterior, anterior, S.ellipsoid([0.052, 1.6015, -0.014], [0.0095, 0.0052, 0.0058]))
  const chin = S.ellipsoid([0, 1.5215, 0.0738], [0.015, 0.007, 0.005])
  return S.smooth(0.006, body, ramus, chin)
}

export function mandibleOuter() {
  return S.mirrorX(mandibleParts())
}

export function buildMandible() {
  let f = S.mirrorX(mandibleParts())
  f = S.subtract(0.0015, f, S.mirrorX(S.capsule([0.021, 1.531, 0.058], [0.028, 1.531, 0.085], 0.0018))) // agujero mentoniano
  const mb = sdfMesh(f, { min: [-0.065, 1.505, -0.028], max: [0.065, 1.612, 0.088] }, 0.0022)
  mb.merge(teethMesh(false))
  return mb
}
