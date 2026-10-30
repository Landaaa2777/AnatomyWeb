/** Capa: sistema óseo. */
import { Vector3, Matrix4, CylinderGeometry } from 'three'
import { MeshBuilder, tube } from './mesh.js'
import * as S from './sdf.js'
import { L, alongArm, alongForearm, VERTEBRAE, spineZ } from './landmarks.js'
import { HAND, FOOT } from './extremities.js'
import { buildSkull, buildMandible, skullOuter, mandibleOuter } from './skull.js'

const sdfMesh = (f, bounds, res) => new MeshBuilder().addRaw(S.polygonize(f, bounds, res))

/* ------------------------------- columna ------------------------------- */

/**
 * Vértebra orgánica (SDF): cuerpo con cintura, pedículos, láminas, apófisis espinosa,
 * transversas y articulares, con el agujero vertebral abierto para la médula.
 */
function vertebra(mb, v) {
  const slope = (spineZ(v.y + 0.005) - spineZ(v.y - 0.005)) / 0.01
  const T = new Vector3(0, 1, slope).normalize()
  const X = new Vector3(1, 0, 0)
  const F = new Vector3().crossVectors(X, T).normalize() // hacia delante
  const C = new Vector3(0, v.y, v.z)
  const r = v.r, h = v.h
  const isC = v.group === 'C', isL = v.group === 'L'
  const fr = isC ? 0.0062 : isL ? 0.0068 : 0.0058 // radio del agujero vertebral
  const tube = r * (isC ? 0.34 : isL ? 0.32 : 0.3)
  const rx = r * (isC ? 1.45 : 1.25)
  const spLen = isC ? (v.name === 'C7' ? 0.024 : 0.012) : isL ? 0.024 : 0.028
  const spDown = isC ? 0.3 : isL ? 0.1 : 0.9
  const trLen = isC ? 0.011 : isL ? 0.026 : 0.02
  const trBack = isL ? 0.05 : isC ? 0.2 : 0.5

  // puntos del arco en coordenadas locales (x lateral, y a lo largo de la columna, z hacia delante)
  const cz = -(r + fr * 0.95) // centro del agujero vertebral
  const ped0 = [rx * 0.5, 0, -r * 0.72]
  const ped1 = [fr + tube * 0.6, 0, cz + fr * 0.15]
  const lamEnd = [0, -h * 0.12, cz - fr - tube * 0.5]
  const spDir = new Vector3(0, -spDown, -1).normalize()
  const spTip = [0, lamEnd[1] + spDir.y * spLen, lamEnd[2] + spDir.z * spLen]
  const trTip = [ped1[0] + trLen, h * 0.05, ped1[2] - trLen * trBack]

  const local = S.union(
    // cuerpo vertebral con cintura
    (x, y, z) => {
      const hh = h / 2
      const waist = 1 - 0.08 * (1 - Math.min(1, (y / hh) ** 2))
      const d2 = S.ellipse2(x, z, rx * waist, r * waist)
      const dy = Math.abs(y) - hh
      return Math.min(Math.max(d2, dy), 0) + Math.hypot(Math.max(d2, 0), Math.max(dy, 0)) - 0.0012
    },
    S.mirrorX(
      S.smooth(
        tube * 0.45,
        S.capsule(ped0, ped1, tube * 0.85),
        S.capsule(ped1, lamEnd, tube * 0.72),
        S.capsule(ped1, trTip, tube * 0.62),
        S.sphere(trTip, tube * 0.78),
        S.capsule([ped1[0] + 0.0012, h * 0.08, ped1[2]], [ped1[0] + 0.0012, h * 0.55, ped1[2] + 0.0012], tube * 0.5),
        S.capsule([ped1[0] + 0.0008, -h * 0.08, ped1[2] - 0.001], [ped1[0] + 0.0008, -h * 0.6, ped1[2] - 0.002], tube * 0.48),
      ),
    ),
    // apófisis espinosa: en las lumbares es una lámina alta y robusta (en hacha)
    isL ? S.segBox(lamEnd, spTip, h * 0.28, tube * 0.55, tube * 0.5) : S.roundCone(lamEnd, spTip, tube * 0.95, tube * 0.62),
  )
  // conducto vertebral abierto
  const holed = S.subtract(0.0008, S.smooth(tube * 0.4, local), S.capsule([0, -h, cz], [0, h, cz], fr * 0.85))

  // de coordenadas del mundo a locales
  const f = (x, y, z) => {
    const px = x - C.x, py = y - C.y, pz = z - C.z
    return holed(px * X.x + py * X.y + pz * X.z, px * T.x + py * T.y + pz * T.z, px * F.x + py * F.y + pz * F.z)
  }
  const ext = ped1[0] + trLen + tube * 2
  const back = -(Math.min(spTip[2], trTip[2]) - tube * 2)
  const vert = Math.max(h * 0.75, Math.abs(spTip[1]) + tube * 2)
  const res = isC ? 0.0014 : isL ? 0.0021 : 0.0018
  mb.addRaw(S.polygonize(f, { min: [-ext, C.y - vert, C.z - back - 0.003], max: [ext, C.y + vert, C.z + r + 0.004] }, res))

  // disco intervertebral (fibrocartílago)
  const disc = C.clone().addScaledVector(T, -h * 0.5 - h * 0.18)
  const m = new Matrix4().makeBasis(X, T, F).scale(new Vector3(rx * 0.95, h * 0.3, r * 0.95)).setPosition(disc)
  mb.addGeometry(new CylinderGeometry(1, 1, 1, 20, 1), m)
}

function spine() {
  const groups = { C: new MeshBuilder(), T: new MeshBuilder(), L: new MeshBuilder() }
  for (const v of VERTEBRAE) vertebra(groups[v.group], v)
  // atlas/axis: apófisis odontoides aproximada
  return groups
}

/* ------------------------------- tórax ------------------------------- */

const sternumZ = (y) => {
  const t = (L.sternumTop[1] - y) / (L.sternumTop[1] - L.sternumBottom[1])
  return L.sternumTop[2] + (L.sternumBottom[2] - L.sternumTop[2]) * t
}

const RIB_W = [0.058, 0.082, 0.1, 0.113, 0.123, 0.13, 0.134, 0.136, 0.134, 0.128, 0.118, 0.1]
const NP = [
  [0.1, -0.25],
  [0.3, -0.55],
  [0.55, -0.62],
  [0.85, -0.35],
  [1.0, 0.05],
  [0.9, 0.45],
  [0.62, 0.78],
  [0.3, 0.96],
]
const W_Y = [0, -0.04, -0.02, 0.18, 0.45, 0.78, 1.02, 1.06]

/** Curva (lado +x) de la costilla k (1..12). La reutilizan los nervios intercostales. */
export function ribPoints(k) {
  const v = VERTEBRAE[7 + k - 1]
  const A = RIB_W[k - 1]
  const y0 = v.y
  let front, yLow
  if (k <= 7) {
    const yf = 1.4 - (k - 1) * 0.026
    front = [0.016 + (k === 1 ? 0.01 : 0), yf, sternumZ(yf)]
    yLow = yf - (k <= 2 ? 0.0 : 0.02 + k * 0.004)
  } else if (k <= 10) {
    const yf = 1.235 - 0.024 * (k - 7)
    front = [0.025 + 0.022 * (k - 7), yf, 0.1 - 0.012 * (k - 7)]
    yLow = y0 - 0.1
  } else {
    front = null
    yLow = y0 - 0.06
  }
  const zBack = v.z - 0.03
  const zFront = front ? front[2] : 0.08
  const D = (zFront - zBack) / 1.62
  const zc = zFront - D
  const n = k <= 10 ? NP.length : k === 11 ? 6 : 5
  const pts = []
  for (let i = 0; i < n; i++) {
    const w = k <= 10 ? W_Y[i] : W_Y[i] * 1.0
    pts.push([NP[i][0] * A, y0 - (y0 - yLow) * w, zc + NP[i][1] * D])
  }
  if (k >= 8 && k <= 10) pts.pop()
  if (front) pts.push(front)
  return pts
}

function ribs() {
  const mb = new MeshBuilder()
  for (let k = 1; k <= 12; k++) {
    const pts = ribPoints(k)
    const floating = k > 10
    tube(mb, pts, (t) => (floating && t > 0.85 ? 0.0055 * (1 - (t - 0.85) * 3) : 0.0055), {
      up: [0, 1, 0],
      flat: k === 1 ? 0.75 : 0.45,
      segments: 40,
      radial: 8,
      caps: true,
    })
  }
  return mb.bilateral()
}

function sternum() {
  const mb = new MeshBuilder()
  const pts = [L.sternumTop, [0, 1.36, sternumZ(1.36) + 0.002], [0, 1.3, sternumZ(1.3) + 0.003], [0, 1.245, sternumZ(1.245)], L.sternumBottom]
  const r = (t) => {
    if (t < 0.2) return 0.026
    if (t < 0.3) return 0.026 - (t - 0.2) * 0.09
    if (t < 0.72) return 0.017 + (t - 0.3) * 0.009
    if (t < 0.85) return 0.021 - (t - 0.72) * 0.1
    return Math.max(0.003, 0.008 - (t - 0.85) * 0.03)
  }
  tube(mb, pts, r, { up: [1, 0, 0], flat: 0.32, caps: true, segments: 40, radial: 14 })
  return mb
}

function clavicle() {
  const mb = new MeshBuilder()
  const pts = [
    [0.02, 1.412, 0.078],
    [0.06, 1.42, 0.083],
    [0.11, 1.432, 0.058],
    [0.15, 1.443, 0.022],
    [0.178, 1.448, -0.008],
  ]
  tube(mb, pts, (t) => 0.0062 + 0.003 * Math.pow(Math.abs(t - 0.5) * 2, 3), { caps: true, segments: 30, radial: 10 })
  return mb.bilateral()
}

function scapula() {
  const sup = [0.075, 1.415, -0.078]
  const inf = [0.097, 1.255, -0.073]
  const lat = [0.158, 1.39, -0.042]
  const f = S.smooth(
    0.008,
    S.triangle(sup, inf, lat, 0.0022),
    S.capsule(sup, inf, 0.0035),
    S.capsule(inf, lat, 0.0048),
    S.capsule(sup, [0.13, 1.41, -0.058], 0.003),
    S.capsule([0.08, 1.385, -0.085], [0.165, 1.425, -0.06], 0.005),
    S.capsule([0.165, 1.425, -0.06], [0.183, 1.445, -0.026], 0.006),
    S.ellipsoid([0.185, 1.446, -0.018], [0.016, 0.006, 0.02]),
    S.ellipsoid([0.158, 1.408, -0.026], [0.008, 0.016, 0.012]),
    S.capsule([0.152, 1.418, -0.026], [0.164, 1.422, 0.016], 0.0045),
  )
  return sdfMesh(f, { min: [0.06, 1.24, -0.1], max: [0.205, 1.47, 0.03] }, 0.0025).bilateral()
}

/* --------------------------------- cráneo --------------------------------- */

// El cráneo y la mandíbula viven en skull.js; se reexportan para la piel.
export { skullOuter, mandibleOuter }

/* ------------------------------ miembro superior ------------------------------ */

function humerus() {
  const f = S.smooth(
    0.012,
    S.sphere([L.shoulder[0] - 0.002, L.shoulder[1] + 0.002, L.shoulder[2]], 0.022),
    S.ellipsoid(alongArm(0.05, 0.017, 0.004), [0.011, 0.014, 0.011]),
    S.roundCone(alongArm(0.07), alongArm(0.5, 0.002), 0.0115, 0.0098),
    S.roundCone(alongArm(0.5, 0.002), alongArm(0.86), 0.0098, 0.0118),
    S.ellipsoid(alongArm(0.97, -0.024, -0.002), [0.009, 0.009, 0.008]),
    S.ellipsoid(alongArm(0.96, 0.019, -0.002), [0.007, 0.008, 0.008]),
    S.capsule(alongArm(1.0, -0.014, 0.004), alongArm(1.0, 0.013, 0.004), 0.0105),
  )
  const pts = [L.shoulder, L.elbow]
  return sdfMesh(f, S.bbox(pts, 0.04), 0.0026).bilateral()
}

function radius() {
  const f = S.smooth(
    0.008,
    S.capsule(alongForearm(0.03, 0.016, 0.002), alongForearm(0.055, 0.016, 0.002), 0.0095),
    S.roundCone(alongForearm(0.055, 0.016), alongForearm(0.5, 0.022, 0.004), 0.006, 0.0075),
    S.roundCone(alongForearm(0.5, 0.022, 0.004), alongForearm(0.93, 0.017, 0.002), 0.0075, 0.0095),
    S.ellipsoid(alongForearm(0.975, 0.012, 0.002), [0.014, 0.009, 0.01]),
    S.sphere(alongForearm(1.0, 0.02, 0.0), 0.0042),
  )
  return sdfMesh(f, S.bbox([L.elbow, L.wrist], 0.04), 0.0022).bilateral()
}

function ulna() {
  const f = S.smooth(
    0.008,
    S.ellipsoid(alongForearm(-0.05, -0.009, -0.014), [0.011, 0.012, 0.011]),
    S.capsule(alongForearm(-0.04, -0.01, -0.008), alongForearm(0.08, -0.012, -0.002), 0.0102),
    S.roundCone(alongForearm(0.08, -0.012, -0.002), alongForearm(0.95, -0.017, -0.003), 0.0085, 0.0055),
    S.sphere(alongForearm(0.975, -0.016, -0.003), 0.0075),
    S.sphere(alongForearm(1.0, -0.021, -0.006), 0.0035),
  )
  return sdfMesh(f, S.bbox([L.elbow, L.wrist], 0.045), 0.0022).bilateral()
}

function hand() {
  const parts = [S.bound(S.union(...HAND.carpals.map((c) => S.sphere(c, 0.0066))), S.bbox(HAND.carpals, 0.007))]
  const fr = [
    [0.0048, 0.0052, 0.0044, 0.0038, 0.0032],
    [0.005, 0.0054, 0.0046, 0.004, 0.0033],
    [0.0047, 0.005, 0.0043, 0.0037, 0.0031],
    [0.0043, 0.0046, 0.004, 0.0034, 0.0029],
  ]
  HAND.fingers.forEach((pts, i) => {
    const fp = []
    for (let k = 0; k < pts.length - 1; k++) {
      // pequeños espacios entre huesos para que se lean las articulaciones
      const a = new Vector3(...pts[k]), b = new Vector3(...pts[k + 1])
      const d = b.clone().sub(a)
      const g = k === 0 ? 0 : 0.0025
      fp.push(S.roundCone(a.clone().addScaledVector(d.normalize(), g).toArray(), b.toArray(), fr[i][k] * 0.85, fr[i][k + 1] * 0.75))
      fp.push(S.sphere(b.toArray(), fr[i][k + 1] * 0.95))
    }
    parts.push(S.bound(S.union(...fp), S.bbox(pts, 0.007)))
  })
  const t = HAND.thumb
  parts.push(S.roundCone(t[0], t[1], 0.0055, 0.0048), S.sphere(t[1], 0.0058))
  parts.push(S.roundCone(t[1], t[2], 0.0045, 0.0042), S.sphere(t[2], 0.0046))
  parts.push(S.roundCone(t[2], t[3], 0.004, 0.0034))
  const f = S.smooth(0.003, ...parts)
  const all = [...HAND.carpals, ...HAND.fingers.flat(), ...HAND.thumb]
  return sdfMesh(f, S.bbox(all, 0.012), 0.0019).bilateral()
}

/* ------------------------------ pelvis y miembro inferior ------------------------------ */

function hipBone() {
  // ala ilíaca: casquete de un elipsoide (forma de cuenco, más ancho arriba)
  const wingRegion = S.ellipsoid([0.112, 0.995, -0.006], [0.06, 0.075, 0.082])
  const wing = S.intersect(0.006, S.shell(S.ellipsoid([0, 1.12, -0.005], [0.148, 0.2, 0.14]), 0.0035), wingRegion)
  const crest = S.chain(
    [
      [0.1, 0.99, 0.06],
      [0.122, 1.03, 0.045],
      [0.137, 1.05, 0.0],
      [0.126, 1.045, -0.045],
      [0.094, 1.02, -0.066],
      [0.06, 0.995, -0.066],
    ],
    0.0055,
  )
  const acetabulum = S.subtract(0.004, S.sphere([0.1, 0.905, 0.016], 0.031), S.sphere(L.hip, 0.026))
  const f = S.smooth(
    0.012,
    wing,
    crest,
    acetabulum,
    S.capsule([0.115, 0.97, 0.0], [0.1, 0.915, 0.012], 0.019),
    S.capsule([0.06, 0.99, -0.064], [0.105, 0.94, -0.02], 0.012),
    S.capsule([0.035, 0.98, -0.06], [0.065, 0.99, -0.063], 0.013),
    S.capsule([0.086, 0.9, 0.04], [0.013, 0.872, 0.066], 0.0095),
    S.capsule([0.013, 0.864, 0.063], [0.045, 0.833, 0.035], 0.0075),
    S.capsule([0.088, 0.885, 0.0], [0.063, 0.835, -0.02], 0.0135),
    S.capsule([0.063, 0.835, -0.012], [0.045, 0.833, 0.035], 0.0075),
    S.capsule([0.1, 0.99, 0.06], [0.104, 0.955, 0.05], 0.0055),
  )
  return sdfMesh(f, { min: [0.0, 0.81, -0.095], max: [0.17, 1.07, 0.085] }, 0.003).bilateral()
}

function sacrum() {
  const body = S.transform(
    [0, 0.94, -0.067],
    [0.42, 0, 0],
    (x, y, z) => {
      const t = Math.min(1, Math.max(0, (0.05 - y) / 0.1))
      const w = 0.048 - t * 0.034
      return S.boxDist(x, y, z, w, 0.05, 0.012, 0.008)
    },
  )
  const promontory = S.ellipsoid([0, 0.985, -0.042], [0.022, 0.008, 0.016])
  const coccyx = S.chain(
    [
      [0, 0.892, -0.088],
      [0, 0.878, -0.084],
      [0, 0.866, -0.076],
    ],
    [0.007, 0.0055, 0.004],
  )
  let f = S.smooth(0.008, body, promontory, coccyx)
  // agujeros sacros
  for (let i = 0; i < 4; i++) {
    const y = 0.97 - i * 0.02
    f = S.subtract(0.002, f, S.mirrorX(S.capsule([0.016 - i * 0.002, y, -0.1], [0.016 - i * 0.002, y + 0.008, -0.03], 0.003)))
  }
  return sdfMesh(f, { min: [-0.065, 0.855, -0.11], max: [0.065, 1.0, -0.02] }, 0.0022)
}

function femur() {
  const f = S.smooth(
    0.01,
    S.sphere(L.hip, 0.0245),
    S.capsule(L.hip, [0.128, 0.884, 0.008], 0.0145),
    S.ellipsoid([0.141, 0.892, 0.0], [0.015, 0.022, 0.017]),
    S.sphere([0.112, 0.855, -0.01], 0.0095),
    S.roundCone([0.135, 0.875, 0.002], [0.122, 0.68, 0.012], 0.0145, 0.0128),
    S.roundCone([0.122, 0.68, 0.012], [0.098, 0.52, 0.0], 0.0128, 0.0175),
    S.ellipsoid([0.078, 0.477, -0.006], [0.0185, 0.022, 0.029]),
    S.ellipsoid([0.114, 0.478, -0.006], [0.0175, 0.021, 0.027]),
  )
  return sdfMesh(f, { min: [0.05, 0.445, -0.045], max: [0.165, 0.935, 0.05] }, 0.0032).bilateral()
}

function patella() {
  const f = S.ellipsoid([0.097, 0.48, 0.036], [0.02, 0.024, 0.0095])
  return sdfMesh(f, { min: [0.07, 0.45, 0.025], max: [0.125, 0.51, 0.06] }, 0.0018).bilateral()
}

function tibia() {
  const f = S.smooth(
    0.01,
    S.ellipsoid([0.095, 0.449, -0.002], [0.039, 0.014, 0.029]),
    S.sphere([0.097, 0.418, 0.024], 0.008),
    S.roundCone([0.095, 0.43, 0.003], [0.091, 0.24, 0.004], 0.018, 0.0122),
    S.roundCone([0.091, 0.24, 0.004], [0.088, 0.1, -0.002], 0.0122, 0.0135),
    S.ellipsoid([0.087, 0.083, -0.004], [0.02, 0.014, 0.018]),
    S.ellipsoid([0.071, 0.07, -0.004], [0.007, 0.012, 0.009]),
  )
  return sdfMesh(f, { min: [0.045, 0.05, -0.04], max: [0.14, 0.47, 0.04] }, 0.0026).bilateral()
}

function fibula() {
  const f = S.smooth(
    0.006,
    S.sphere([0.125, 0.424, -0.013], 0.0098),
    S.roundCone([0.125, 0.42, -0.013], [0.121, 0.24, -0.01], 0.006, 0.0055),
    S.roundCone([0.121, 0.24, -0.01], [0.117, 0.09, -0.012], 0.0055, 0.0062),
    S.ellipsoid([0.117, 0.07, -0.015], [0.0075, 0.015, 0.0095]),
  )
  return sdfMesh(f, { min: [0.1, 0.05, -0.03], max: [0.14, 0.44, 0.0] }, 0.0022).bilateral()
}

function foot() {
  const { fp, toes } = FOOT
  const parts = [
    S.ellipsoid(fp(0.056, 0.0, 0.05), [0.016, 0.012, 0.021]),
    S.roundCone(fp(0.012, 0.004, 0.022), fp(0.072, 0.009, 0.03), 0.018, 0.013),
    S.ellipsoid(fp(0.088, -0.012, 0.044), [0.012, 0.01, 0.008]),
    S.ellipsoid(fp(0.096, 0.017, 0.027), [0.011, 0.011, 0.012]),
    S.sphere(fp(0.108, -0.02, 0.037), 0.0075),
    S.sphere(fp(0.108, -0.008, 0.04), 0.0072),
    S.sphere(fp(0.108, 0.004, 0.038), 0.0072),
  ]
  const tarsus = S.bound(S.union(...parts), { min: [0.05, 0, -0.075], max: [0.14, 0.07, 0.07] })
  const toeParts = []
  toes.forEach((pts, i) => {
    const big = i === 0 ? 1.45 : 1
    const tp = []
    for (let k = 0; k < pts.length - 1; k++) {
      const r0 = (k === 0 ? 0.0055 : 0.0046 - k * 0.0004) * big
      const r1 = (k === 0 ? 0.0048 : 0.0042 - k * 0.0004) * big
      tp.push(S.roundCone(pts[k], pts[k + 1], r0, r1))
      tp.push(S.sphere(pts[k + 1], r1 * 1.08))
    }
    toeParts.push(S.bound(S.union(...tp), S.bbox(pts, 0.01)))
  })
  const f = S.smooth(0.004, tarsus, ...toeParts)
  return sdfMesh(f, { min: [0.035, -0.005, -0.085], max: [0.16, 0.075, 0.2] }, 0.0022).bilateral()
}

/* --------------------------------- export --------------------------------- */

/**
 * El esqueleto es la capa más costosa: se puede generar en dos trabajos en paralelo
 * ('axial': cráneo, columna y tórax; 'resto': cinturas y extremidades).
 */
export function buildSkeleton(progress, subset) {
  const parts = []
  const add = (id, build) => {
    parts.push({ id, layer: 'esqueleto', mesh: build() })
    progress?.(id)
  }
  if (subset !== 'resto') {
    const sp = spine()
    add('craneo', buildSkull)
    add('mandibula', buildMandible)
    add('columna-cervical', () => sp.C)
    add('columna-toracica', () => sp.T)
    add('columna-lumbar', () => sp.L)
    add('sacro', sacrum)
    add('costillas', ribs)
    add('esternon', sternum)
  }
  if (subset !== 'axial') {
    add('clavicula', clavicle)
    add('escapula', scapula)
    add('humero', humerus)
    add('radio', radius)
    add('cubito', ulna)
    add('mano', hand)
    add('pelvis', hipBone)
    add('femur', femur)
    add('rotula', patella)
    add('tibia', tibia)
    add('perone', fibula)
    add('pie', foot)
  }
  return parts
}

