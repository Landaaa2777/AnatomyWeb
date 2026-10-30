/** Capa: sistema circulatorio (corazón, arterias y venas principales). */
import { Vector3 } from 'three'
import { MeshBuilder, tube } from './mesh.js'
import * as S from './sdf.js'
import { alongArm, alongForearm, alongHand, ARM } from './landmarks.js'
import { HAND, FOOT } from './extremities.js'

const sdfMesh = (f, bounds, res) => new MeshBuilder().addRaw(S.polygonize(f, bounds, res))

/** Vaso con radio que se estrecha de r0 a r1. */
const vessel = (mb, pts, r0, r1 = r0, seg) =>
  tube(mb, pts, (t) => r0 + (r1 - r0) * t, { segments: seg ?? Math.max(12, pts.length * 8), radial: 10, caps: true })

/** Pequeñas ramas digitales siguiendo los dedos (desplazadas hacia la palma o el dorso). */
function fingerVessels(mb, offset, r) {
  const off = ARM.Z.clone().multiplyScalar(offset)
  for (const f of HAND.fingers) vessel(mb, f.slice(1).map((p) => new Vector3(...p).add(off)), r, r * 0.6)
  vessel(mb, HAND.thumb.slice(1).map((p) => new Vector3(...p).add(off)), r, r * 0.6)
}

function heart() {
  const local = S.smooth(
    0.016,
    S.roundCone([0, 0.012, 0], [0.004, -0.052, 0.006], 0.04, 0.011),
    S.ellipsoid([-0.014, -0.006, 0.018], [0.034, 0.04, 0.025]),
    S.ellipsoid([-0.024, 0.034, -0.012], [0.026, 0.022, 0.024]),
    S.ellipsoid([0.018, 0.032, -0.022], [0.024, 0.02, 0.022]),
    S.ellipsoid([-0.03, 0.04, 0.012], [0.012, 0.01, 0.012]),
  )
  const f = S.transform([0.012, 1.255, 0.045], [-0.4, 0, 0.75], local)
  const mb = sdfMesh(f, { min: [-0.07, 1.18, -0.035], max: [0.1, 1.33, 0.12] }, 0.0027)
  // arterias coronarias
  vessel(mb, [[-0.002, 1.284, 0.07], [-0.025, 1.265, 0.075], [-0.035, 1.235, 0.06], [-0.03, 1.21, 0.045]], 0.0017, 0.0012)
  vessel(mb, [[0.008, 1.286, 0.072], [0.025, 1.27, 0.088], [0.045, 1.235, 0.085], [0.06, 1.205, 0.068]], 0.0017, 0.0012)
  vessel(mb, [[0.012, 1.283, 0.07], [0.04, 1.278, 0.06], [0.055, 1.255, 0.04]], 0.0015, 0.001)
  return mb
}

function aorta() {
  const mb = new MeshBuilder()
  vessel(
    mb,
    [
      [0.0, 1.285, 0.046],
      [0.0, 1.33, 0.045],
      [0.004, 1.368, 0.03],
      [0.014, 1.372, 0.006],
      [0.02, 1.355, -0.014],
      [0.02, 1.3, -0.022],
      [0.017, 1.2, -0.018],
      [0.013, 1.12, 0.0],
      [0.009, 1.05, 0.012],
      [0.004, 1.006, 0.014],
    ],
    0.0125,
    0.0088,
    120,
  )
  // tronco braquiocefálico
  vessel(mb, [[0.0, 1.368, 0.032], [-0.012, 1.393, 0.033], [-0.02, 1.405, 0.032]], 0.0065, 0.0055)
  // tronco celíaco y mesentérica superior con ramas
  vessel(mb, [[0.012, 1.15, 0.006], [0.015, 1.158, 0.03]], 0.003, 0.0025)
  vessel(mb, [[0.011, 1.13, 0.008], [0.004, 1.09, 0.04], [-0.01, 1.0, 0.046]], 0.0032, 0.002)
  for (let i = 0; i < 5; i++) {
    const t = 0.25 + i * 0.15
    const y = 1.09 - t * 0.09
    vessel(mb, [[0.004 - t * 0.014, y, 0.042], [0.03 - i * 0.004, y - 0.02, 0.04], [0.05 - i * 0.012, y - 0.04, 0.03]], 0.0015, 0.001)
  }
  // arterias renales
  vessel(mb, [[0.012, 1.08, 0.012], [0.03, 1.08, -0.01], [0.042, 1.078, -0.032]], 0.0035, 0.003)
  vessel(mb, [[0.006, 1.074, 0.012], [-0.02, 1.07, -0.008], [-0.04, 1.064, -0.032]], 0.0035, 0.003)
  return mb
}

function carotids() {
  const mb = new MeshBuilder()
  const neck = (s) => {
    vessel(mb, [[s * 0.022, 1.42, 0.032], [s * 0.027, 1.47, 0.031], [s * 0.029, 1.53, 0.028]], 0.0045, 0.0042)
    // interna (hacia el encéfalo)
    vessel(mb, [[s * 0.029, 1.53, 0.028], [s * 0.032, 1.56, 0.012], [s * 0.026, 1.6, 0.0], [s * 0.016, 1.612, 0.0]], 0.0036, 0.003)
    // externa: facial y temporal superficial
    vessel(mb, [[s * 0.029, 1.53, 0.028], [s * 0.036, 1.555, 0.04], [s * 0.042, 1.572, 0.056], [s * 0.028, 1.598, 0.074]], 0.0028, 0.0016)
    vessel(mb, [[s * 0.032, 1.545, 0.024], [s * 0.06, 1.585, 0.008], [s * 0.072, 1.64, 0.004], [s * 0.066, 1.69, 0.012], [s * 0.045, 1.725, 0.025]], 0.0022, 0.0013)
    // arterias cerebrales (media) sobre el encéfalo
    vessel(mb, [[s * 0.016, 1.612, 0.0], [s * 0.045, 1.625, 0.004], [s * 0.06, 1.66, -0.01], [s * 0.05, 1.7, -0.03]], 0.0018, 0.0011)
    vessel(mb, [[s * 0.016, 1.612, 0.0], [s * 0.008, 1.64, 0.04], [s * 0.006, 1.69, 0.04], [s * 0.006, 1.72, -0.01]], 0.0016, 0.001)
  }
  neck(1)
  neck(-1)
  // origen izquierdo directo del arco aórtico; el derecho sale del tronco braquiocefálico
  vessel(mb, [[0.008, 1.372, 0.024], [0.018, 1.395, 0.03], [0.022, 1.42, 0.032]], 0.0048, 0.0045)
  vessel(mb, [[-0.02, 1.405, 0.032], [-0.022, 1.42, 0.032]], 0.0048, 0.0045)
  return mb
}

function armArteries() {
  const side = new MeshBuilder()
  vessel(
    side,
    [
      [0.02, 1.405, 0.03],
      [0.06, 1.425, 0.022],
      [0.11, 1.416, 0.01],
      [0.16, 1.39, 0.005],
      [0.2, 1.352, 0.008],
      alongArm(0.3, -0.016, 0.012),
      alongArm(0.65, -0.014, 0.014),
      alongArm(0.98, -0.004, 0.02),
    ],
    0.0045,
    0.0034,
    80,
  )
  vessel(side, [alongArm(0.98, -0.004, 0.02), alongForearm(0.1, 0.01, 0.016), alongForearm(0.6, 0.016, 0.012), alongForearm(0.97, 0.018, 0.012), alongHand(0.03, 0.015, 0.01)], 0.0026, 0.002)
  vessel(side, [alongArm(0.98, -0.004, 0.02), alongForearm(0.1, -0.008, 0.016), alongForearm(0.6, -0.016, 0.012), alongForearm(0.97, -0.017, 0.012), alongHand(0.03, -0.012, 0.012)], 0.0026, 0.002)
  vessel(side, [alongHand(0.03, -0.012, 0.012), alongHand(0.05, -0.004, 0.013), alongHand(0.052, 0.008, 0.013), alongHand(0.032, 0.016, 0.011)], 0.0018, 0.0016)
  fingerVessels(side, 0.0035, 0.0011)
  const mb = side.bilateral()
  // subclavia izquierda desde el arco aórtico
  vessel(mb, [[0.015, 1.37, 0.008], [0.02, 1.395, 0.02], [0.03, 1.413, 0.026], [0.045, 1.42, 0.024]], 0.0048, 0.0045)
  return mb
}

function legArteries() {
  const { fp } = FOOT
  const side = new MeshBuilder()
  vessel(side, [[0.004, 1.006, 0.014], [0.03, 0.98, 0.02], [0.045, 0.96, 0.025]], 0.0068, 0.006)
  vessel(side, [[0.045, 0.96, 0.025], [0.05, 0.93, 0.0], [0.056, 0.91, -0.022]], 0.004, 0.003)
  vessel(
    side,
    [
      [0.045, 0.96, 0.025],
      [0.065, 0.93, 0.04],
      [0.08, 0.895, 0.052],
      [0.085, 0.86, 0.05],
      [0.088, 0.78, 0.042],
      [0.085, 0.68, 0.025],
      [0.078, 0.57, 0.0],
      [0.088, 0.5, -0.022],
      [0.095, 0.44, -0.025],
    ],
    0.0058,
    0.0045,
    90,
  )
  vessel(side, [[0.086, 0.84, 0.048], [0.1, 0.78, 0.022], [0.11, 0.68, 0.0], [0.108, 0.6, -0.01]], 0.0035, 0.0022)
  vessel(side, [[0.095, 0.44, -0.025], [0.103, 0.415, -0.012], [0.106, 0.39, 0.006], [0.105, 0.3, 0.012], [0.098, 0.15, 0.012], [0.092, 0.085, 0.015], fp(0.1, 0.0, 0.045), fp(0.15, -0.01, 0.03)], 0.003, 0.0018, 70)
  vessel(side, [[0.095, 0.44, -0.025], [0.092, 0.4, -0.03], [0.088, 0.3, -0.026], [0.08, 0.15, -0.02], [0.07, 0.07, -0.022], fp(0.06, -0.015, 0.012), fp(0.12, -0.005, 0.008), fp(0.14, 0.015, 0.01)], 0.003, 0.0018, 70)
  vessel(side, [[0.092, 0.4, -0.03], [0.108, 0.3, -0.024], [0.114, 0.15, -0.02], [0.113, 0.08, -0.018]], 0.0022, 0.0015)
  return side.bilateral()
}

function venaCava() {
  const mb = new MeshBuilder()
  vessel(mb, [[-0.018, 1.29, 0.035], [-0.022, 1.33, 0.035], [-0.024, 1.37, 0.035]], 0.0105, 0.0095)
  vessel(mb, [[-0.024, 1.37, 0.035], [-0.035, 1.395, 0.033], [-0.04, 1.41, 0.03]], 0.0075, 0.007)
  vessel(mb, [[-0.024, 1.37, 0.035], [0.0, 1.386, 0.043], [0.025, 1.396, 0.04], [0.04, 1.408, 0.032]], 0.0068, 0.0065)
  vessel(mb, [[-0.012, 1.235, 0.03], [-0.02, 1.2, 0.01], [-0.022, 1.15, -0.002], [-0.02, 1.08, 0.006], [-0.016, 1.02, 0.01], [-0.008, 0.99, 0.012]], 0.012, 0.0105, 70)
  for (const s of [-1, 1]) {
    vessel(mb, [[-0.008, 0.99, 0.012], [s * 0.03, 0.965, 0.012], [s * 0.05, 0.94, 0.018], [s * 0.068, 0.91, 0.035], [s * 0.075, 0.895, 0.045]], 0.0072, 0.0062)
  }
  vessel(mb, [[-0.018, 1.075, 0.008], [-0.032, 1.07, -0.012], [-0.042, 1.065, -0.028]], 0.004, 0.0035)
  vessel(mb, [[-0.016, 1.078, 0.01], [0.012, 1.083, 0.026], [0.032, 1.083, 0.0], [0.045, 1.08, -0.028]], 0.004, 0.0035)
  vessel(mb, [[-0.022, 1.17, 0.0], [-0.05, 1.163, 0.02]], 0.0045, 0.003)
  vessel(mb, [[-0.02, 1.172, 0.004], [-0.005, 1.178, 0.025]], 0.004, 0.003)
  return mb
}

function jugulars() {
  const side = new MeshBuilder()
  vessel(side, [[0.04, 1.408, 0.032], [0.04, 1.46, 0.024], [0.039, 1.52, 0.012], [0.042, 1.56, -0.002], [0.045, 1.582, -0.012]], 0.0058, 0.005)
  vessel(side, [[0.05, 1.415, 0.022], [0.046, 1.48, 0.012], [0.045, 1.54, 0.0], [0.048, 1.585, -0.012]], 0.003, 0.0026)
  vessel(side, [[0.041, 1.53, 0.019], [0.046, 1.56, 0.05], [0.03, 1.6, 0.078]], 0.0019, 0.0014)
  return side.bilateral()
}

function armVeins() {
  const side = new MeshBuilder()
  vessel(side, [[0.04, 1.408, 0.032], [0.08, 1.418, 0.03], [0.13, 1.41, 0.02], [0.17, 1.385, 0.012], [0.2, 1.35, 0.012], alongArm(0.35, -0.022, 0.006), alongArm(0.7, -0.02, 0.01), alongArm(0.97, -0.012, 0.016)], 0.0055, 0.0032, 80)
  vessel(side, [alongForearm(0.98, 0.016, 0.006), alongForearm(0.5, 0.024, 0.012), alongArm(0.95, 0.023, 0.02), alongArm(0.5, 0.025, 0.021), [0.19, 1.4, 0.042], [0.15, 1.41, 0.034], [0.14, 1.405, 0.022]], 0.0028, 0.0032)
  vessel(side, [alongForearm(0.98, -0.018, 0.003), alongForearm(0.5, -0.024, 0.01), alongArm(0.95, -0.03, 0.012), alongArm(0.55, -0.025, 0.008), alongArm(0.4, -0.022, 0.006)], 0.0026, 0.003)
  vessel(side, [alongForearm(0.05, 0.022, 0.02), alongForearm(0.0, 0.0, 0.024), alongArm(0.96, -0.028, 0.016)], 0.0022, 0.0022)
  // red venosa dorsal de la mano
  vessel(side, [alongHand(0.075, 0.018, -0.009), alongHand(0.045, 0.012, -0.01), alongHand(0.04, -0.01, -0.01), alongHand(0.07, -0.022, -0.009)], 0.0016, 0.0016)
  vessel(side, [alongHand(0.045, 0.012, -0.01), alongHand(0.012, 0.016, -0.008), alongForearm(0.98, 0.016, 0.006)], 0.0018, 0.0022)
  vessel(side, [alongHand(0.04, -0.01, -0.01), alongHand(0.01, -0.016, -0.008), alongForearm(0.98, -0.018, 0.003)], 0.0018, 0.0022)
  fingerVessels(side, -0.0035, 0.001)
  return side.bilateral()
}

function legVeins() {
  const { fp } = FOOT
  const side = new MeshBuilder()
  // safena mayor
  vessel(side, [fp(0.13, -0.026, 0.03), fp(0.08, -0.024, 0.042), [0.068, 0.085, 0.01], [0.066, 0.25, 0.002], [0.064, 0.46, -0.016], [0.07, 0.65, 0.022], [0.075, 0.82, 0.046], [0.076, 0.868, 0.05]], 0.0026, 0.004, 90)
  // femoral y poplítea
  vessel(side, [[0.075, 0.895, 0.045], [0.078, 0.86, 0.044], [0.08, 0.78, 0.035], [0.078, 0.68, 0.019], [0.071, 0.57, -0.006], [0.083, 0.5, -0.03], [0.09, 0.44, -0.031], [0.087, 0.3, -0.03], [0.079, 0.15, -0.025], [0.072, 0.075, -0.028]], 0.0062, 0.003, 90)
  // safena menor
  vessel(side, [[0.11, 0.08, -0.026], [0.104, 0.18, -0.04], [0.098, 0.3, -0.044], [0.09, 0.45, -0.034]], 0.0022, 0.0028)
  // arco venoso dorsal del pie
  vessel(side, [fp(0.13, -0.026, 0.03), fp(0.15, -0.01, 0.032), fp(0.148, 0.012, 0.03), fp(0.12, 0.028, 0.026), fp(0.07, 0.022, 0.032), [0.11, 0.08, -0.026]], 0.0018, 0.002)
  return side.bilateral()
}

function pulmonaryTrunk() {
  const mb = new MeshBuilder()
  vessel(mb, [[0.0, 1.272, 0.078], [0.01, 1.31, 0.064], [0.012, 1.33, 0.045]], 0.0105, 0.0095)
  vessel(mb, [[0.012, 1.33, 0.045], [0.035, 1.336, 0.03], [0.062, 1.32, 0.01]], 0.0072, 0.006)
  vessel(mb, [[0.012, 1.33, 0.045], [-0.01, 1.336, 0.022], [-0.035, 1.326, 0.012], [-0.062, 1.316, 0.004]], 0.0075, 0.006)
  // venas pulmonares hacia la aurícula izquierda
  for (const [x, y] of [[-0.055, 1.29], [-0.055, 1.252], [0.062, 1.29], [0.062, 1.252]]) {
    vessel(mb, [[0.02, 1.267, 0.012], [x * 0.6, y, 0.004], [x, y, 0.002]], 0.0042, 0.0036)
  }
  // ramas intrapulmonares
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = -0.9 + i * 0.6
      vessel(mb, [[s * 0.062, 1.316, 0.004], [s * (0.08 + 0.01 * Math.cos(a)), 1.316 + 0.04 * Math.sin(a), 0.006], [s * (0.1 + 0.015 * Math.cos(a)), 1.316 + 0.08 * Math.sin(a), 0.0]], 0.0028, 0.0012)
    }
  }
  return mb
}

export function buildCirculatory(progress) {
  const parts = []
  const add = (id, mb) => {
    parts.push({ id, layer: 'circulatorio', mesh: mb })
    progress?.(id)
  }
  add('corazon', heart())
  add('aorta', aorta())
  add('tronco-pulmonar', pulmonaryTrunk())
  add('carotidas', carotids())
  add('arterias-brazo', armArteries())
  add('arterias-pierna', legArteries())
  add('vena-cava', venaCava())
  add('yugulares', jugulars())
  add('venas-brazo', armVeins())
  add('venas-pierna', legVeins())
  return parts
}
