/** Capa: sistema muscular (músculos superficiales principales). */
import { MeshBuilder, tube, spindle } from './mesh.js'
import * as S from './sdf.js'
import { alongArm, alongForearm, torsoAt, spineZ } from './landmarks.js'
import { FOOT } from './extremities.js'

const lerp = (a, b, t) => a + (b - a) * t

/** Punto en la cara anterior / posterior del tronco, `inset` metros bajo la piel. */
function onFront(x, y, inset) {
  const { a, b, cz } = torsoAt(y)
  return [x, y, cz + b * Math.sqrt(Math.max(0.0, 1 - (x / a) ** 2)) - inset]
}
function onBack(x, y, inset) {
  const { a, b, cz } = torsoAt(y)
  return [x, y, cz - b * Math.sqrt(Math.max(0.0, 1 - (x / a) ** 2)) + inset]
}
function normalAt(p) {
  const { a, b, cz } = torsoAt(p[1])
  const nx = p[0] / (a * a), nz = (p[2] - cz) / (b * b)
  const l = Math.hypot(nx, nz) || 1
  return [nx / l, 0, nz / l]
}

/** Músculo fusiforme. */
const muscle = (mb, pts, r, o = {}) =>
  tube(mb, pts, spindle(r, o.end ?? 0.22, o.power ?? 0.75, o.bias ?? 0.5), {
    segments: o.seg ?? 30,
    radial: 14,
    flat: o.flat ?? 1,
    up: o.up,
    caps: true,
  })

/** Músculo plano (cinta): r = medio grosor, width = semiancho / grosor. */
const sheet = (mb, pts, r, width, up, o = {}) =>
  tube(mb, pts, o.profile ?? spindle(r, o.end ?? 0.35, 0.6, o.bias ?? 0.5), { segments: o.seg ?? 26, radial: 12, flat: width, up, caps: true })

function scm() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.058, 1.585, -0.018], [0.052, 1.53, 0.018], [0.038, 1.47, 0.048], [0.022, 1.425, 0.07]], 0.0088)
  muscle(mb, [[0.052, 1.58, -0.016], [0.05, 1.52, 0.01], [0.047, 1.46, 0.04], [0.045, 1.425, 0.06]], 0.0058)
  return mb.bilateral()
}

function trapezius() {
  const mb = new MeshBuilder()
  const fibers = [
    [[0.006, 1.575, spineZ(1.575) - 0.05], [0.16, 1.448, -0.012]],
    [[0.006, 1.515, spineZ(1.515) - 0.05], [0.175, 1.445, -0.032]],
    [[0.006, 1.46, null], [0.162, 1.432, -0.06]],
    [[0.006, 1.39, null], [0.13, 1.41, -0.08]],
    [[0.006, 1.31, null], [0.105, 1.397, -0.088]],
    [[0.006, 1.23, null], [0.088, 1.388, -0.09]],
  ]
  for (const [o, ins] of fibers) {
    const origin = o[2] === null ? onBack(o[0], o[1], 0.009) : o
    const pts = [origin]
    for (const t of [0.35, 0.7]) {
      const x = lerp(origin[0], ins[0], t), y = lerp(origin[1], ins[1], t)
      pts.push(y < 1.47 ? onBack(x, y, 0.01) : [x, y, lerp(origin[2], ins[2], t) - 0.006])
    }
    pts.push(ins)
    sheet(mb, pts, 0.0042, 4.2, [0, 0, -1], { end: 0.55 })
  }
  return mb.bilateral()
}

function deltoid() {
  const mb = new MeshBuilder()
  const ins = (z) => alongArm(0.42, 0.017, z)
  muscle(mb, [[0.15, 1.443, 0.022], [0.205, 1.428, 0.034], [0.226, 1.36, 0.022], ins(0.004)], 0.0132, { bias: 0.4 })
  muscle(mb, [[0.185, 1.456, -0.008], [0.228, 1.432, -0.005], [0.242, 1.36, -0.004], ins(0.0)], 0.0145, { bias: 0.4 })
  muscle(mb, [[0.155, 1.43, -0.055], [0.205, 1.42, -0.045], [0.226, 1.36, -0.026], ins(-0.004)], 0.0132, { bias: 0.4 })
  return mb.bilateral()
}

function pectoralis() {
  const mb = new MeshBuilder()
  const ins = alongArm(0.2, 0.012, 0.022)
  const origins = [
    [0.035, 1.42, 0.076],
    [0.075, 1.425, 0.07],
    ...[1.39, 1.35, 1.31, 1.27, 1.235].map((y) => onFront(0.014, y, 0.011)),
  ]
  for (const o of origins) {
    const m1 = onFront(lerp(o[0], 0.17, 0.4), lerp(o[1], 1.375, 0.4), 0.011)
    const m2 = onFront(lerp(o[0], 0.17, 0.75), lerp(o[1], 1.375, 0.75), 0.013)
    sheet(mb, [o, m1, m2, [0.165, 1.375, 0.035], ins], 0.006, 2.8, [0, 0, 1], { end: 0.45, bias: 0.4 })
  }
  return mb.bilateral()
}

function biceps() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.168, 1.405, 0.01], alongArm(0.2, 0.0, 0.024), alongArm(0.55, 0.0, 0.026), alongArm(0.88, 0.0, 0.02), alongForearm(0.08, 0.008, 0.012)], 0.013, { bias: 0.58 })
  return mb.bilateral()
}

function triceps() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.165, 1.39, -0.035], alongArm(0.25, -0.004, -0.024), alongArm(0.55, 0.0, -0.025), alongArm(0.9, 0.0, -0.02), alongForearm(-0.04, -0.005, -0.016)], 0.0135, { bias: 0.45 })
  muscle(mb, [alongArm(0.15, 0.016, -0.012), alongArm(0.45, 0.02, -0.018), alongArm(0.85, 0.01, -0.018)], 0.008)
  return mb.bilateral()
}

function forearm() {
  const mb = new MeshBuilder()
  muscle(mb, [alongArm(0.97, -0.026, 0.004), alongForearm(0.3, -0.012, 0.018), alongForearm(0.75, -0.006, 0.012), alongForearm(1.0, -0.004, 0.01)], 0.0125, { bias: 0.3 })
  muscle(mb, [alongArm(0.96, 0.022, -0.004), alongForearm(0.3, 0.012, -0.016), alongForearm(0.75, 0.006, -0.012), alongForearm(1.0, 0.004, -0.01)], 0.012, { bias: 0.3 })
  muscle(mb, [alongArm(0.75, 0.025, 0.006), alongForearm(0.15, 0.024, 0.012), alongForearm(0.6, 0.022, 0.006), alongForearm(0.98, 0.022, 0.0)], 0.0105, { bias: 0.3 })
  muscle(mb, [alongArm(0.98, -0.022, 0.01), alongForearm(0.35, -0.002, 0.022), alongForearm(0.95, 0.0, 0.014)], 0.0085, { bias: 0.3 })
  return mb.bilateral()
}

function rectusAbdominis() {
  const mb = new MeshBuilder()
  const pts = [1.265, 1.2, 1.13, 1.06, 0.99, 0.93, 0.89].map((y) => onFront(0.021, y, 0.011))
  pts.push([0.012, 0.872, 0.07])
  // intersecciones tendinosas: estrechamientos periódicos
  const profile = (t) => {
    const seg = 0.82 + 0.18 * Math.abs(Math.sin(Math.PI * t * 4.2 + 0.3))
    const taper = t > 0.82 ? 1 - (t - 0.82) * 2.6 : 1
    return 0.0042 * seg * taper
  }
  sheet(mb, pts, 0.0042, 3.9, [0, 0, 1], { profile, seg: 60 })
  return mb.bilateral()
}

function obliques() {
  const mb = new MeshBuilder()
  const fibers = [
    [onFront(0.124, 1.225, 0.012), onFront(0.09, 1.13, 0.01), onFront(0.04, 1.05, 0.01)],
    [onFront(0.138, 1.165, 0.012), onFront(0.11, 1.07, 0.01), onFront(0.05, 0.98, 0.012)],
    [onFront(0.14, 1.1, 0.012), onFront(0.125, 1.02, 0.012), onFront(0.08, 0.95, 0.012)],
    [onBack(0.13, 1.08, 0.012), onFront(0.152, 1.02, 0.012), onFront(0.12, 0.97, 0.012)],
  ]
  for (const f of fibers) sheet(mb, f, 0.0034, 4.2, normalAt(f[1]), { end: 0.5 })
  return mb.bilateral()
}

function latissimus() {
  const mb = new MeshBuilder()
  const ins = alongArm(0.14, -0.008, 0.008)
  const origins = [1.27, 1.19, 1.11, 1.04].map((y) => onBack(0.015, y, 0.01))
  origins.push(onBack(0.11, 1.035, 0.012))
  for (const o of origins) {
    const m1 = onBack(lerp(o[0], 0.1, 0.6), lerp(o[1], 1.32, 0.35), 0.011)
    const m2 = onBack(0.13, lerp(o[1], 1.32, 0.72), 0.012)
    sheet(mb, [o, m1, m2, [0.158, 1.335, -0.022], ins], 0.0045, 2.8, [0, 0, -1], { end: 0.45, bias: 0.4 })
  }
  return mb.bilateral()
}

function gluteus() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.03, 0.97, -0.086], [0.09, 0.91, -0.092], [0.14, 0.862, -0.045]], 0.026, { flat: 0.6, up: [1, 0, 0] })
  muscle(mb, [[0.02, 0.92, -0.09], [0.08, 0.86, -0.092], [0.135, 0.82, -0.038]], 0.024, { flat: 0.6, up: [1, 0, 0] })
  muscle(mb, [[0.065, 0.99, -0.075], [0.115, 0.93, -0.074], [0.146, 0.875, -0.032]], 0.018, { flat: 0.6, up: [1, 0, 0] })
  return mb.bilateral()
}

function quadriceps() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.1, 0.955, 0.045], [0.106, 0.85, 0.052], [0.106, 0.72, 0.05], [0.1, 0.56, 0.047], [0.097, 0.505, 0.042]], 0.018)
  muscle(mb, [[0.138, 0.87, 0.01], [0.142, 0.75, 0.018], [0.133, 0.6, 0.026], [0.116, 0.5, 0.034]], 0.017)
  muscle(mb, [[0.1, 0.8, 0.025], [0.076, 0.68, 0.034], [0.073, 0.56, 0.038], [0.086, 0.5, 0.04]], 0.019, { bias: 0.66 })
  // tendón rotuliano
  muscle(mb, [[0.097, 0.47, 0.044], [0.097, 0.44, 0.035], [0.097, 0.418, 0.028]], 0.006, { end: 0.7 })
  return mb.bilateral()
}

function hamstrings() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.065, 0.84, -0.03], [0.096, 0.72, -0.046], [0.112, 0.56, -0.036], [0.122, 0.44, -0.02]], 0.016)
  muscle(mb, [[0.062, 0.835, -0.028], [0.072, 0.72, -0.046], [0.076, 0.56, -0.04], [0.075, 0.44, -0.02]], 0.014)
  return mb.bilateral()
}

function sartorius() {
  const mb = new MeshBuilder()
  sheet(mb, [[0.1, 0.99, 0.06], [0.1, 0.88, 0.07], [0.09, 0.75, 0.06], [0.068, 0.6, 0.03], [0.06, 0.5, -0.004], [0.072, 0.43, 0.008]], 0.0055, 1.9, [0, 0, 1], { end: 0.5, seg: 40 })
  return mb.bilateral()
}

function adductors() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.03, 0.865, 0.04], [0.06, 0.75, 0.025], [0.1, 0.6, 0.0]], 0.019)
  muscle(mb, [[0.04, 0.845, 0.02], [0.065, 0.72, 0.0], [0.085, 0.55, -0.01]], 0.019, { bias: 0.4 })
  muscle(mb, [[0.025, 0.86, 0.03], [0.05, 0.7, 0.0], [0.065, 0.52, -0.01], [0.074, 0.44, 0.0]], 0.0075)
  return mb.bilateral()
}

function gastrocnemius() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.08, 0.49, -0.028], [0.078, 0.36, -0.04], [0.088, 0.25, -0.04], [0.09, 0.17, -0.04]], 0.018, { bias: 0.32 })
  muscle(mb, [[0.112, 0.49, -0.028], [0.113, 0.36, -0.039], [0.1, 0.25, -0.04], [0.092, 0.17, -0.04]], 0.017, { bias: 0.32 })
  // tendón de Aquiles
  muscle(mb, [[0.091, 0.2, -0.038], [0.09, 0.12, -0.04], [0.089, 0.06, -0.05], [0.089, 0.035, -0.06]], 0.0046, { end: 0.75 })
  return mb.bilateral()
}

function tibialisAnterior() {
  const mb = new MeshBuilder()
  muscle(mb, [[0.11, 0.42, 0.012], [0.11, 0.3, 0.021], [0.1, 0.15, 0.02], [0.088, 0.085, 0.014], FOOT.fp(0.09, -0.02, 0.032)], 0.011, { bias: 0.28 })
  return mb.bilateral()
}

function diaphragm() {
  const dome = S.shell(S.ellipsoid([0, 1.128, 0.004], [0.132, 0.078, 0.086]), 0.0018)
  const f = S.intersect(0.004, dome, (x, y, z) => 1.13 + z * 0.15 - y)
  return new MeshBuilder().addRaw(S.polygonize(f, { min: [-0.14, 1.1, -0.09], max: [0.14, 1.21, 0.095] }, 0.0042))
}

export function buildMuscles(progress) {
  const parts = []
  const add = (id, mb) => {
    parts.push({ id, layer: 'musculos', mesh: mb })
    progress?.(id)
  }
  add('esternocleidomastoideo', scm())
  add('trapecio', trapezius())
  add('deltoides', deltoid())
  add('pectoral-mayor', pectoralis())
  add('biceps', biceps())
  add('triceps', triceps())
  add('antebrazo', forearm())
  add('recto-abdominal', rectusAbdominis())
  add('oblicuos', obliques())
  add('dorsal-ancho', latissimus())
  add('gluteo-mayor', gluteus())
  add('cuadriceps', quadriceps())
  add('isquiotibiales', hamstrings())
  add('sartorio', sartorius())
  add('aductores', adductors())
  add('gastrocnemio', gastrocnemius())
  add('tibial-anterior', tibialisAnterior())
  add('diafragma', diaphragm())
  return parts
}
