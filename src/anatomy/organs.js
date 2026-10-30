/** Capa: órganos internos (respiratorio, digestivo, urinario y endocrino). */
import { Vector3 } from 'three'
import { MeshBuilder, tube, curve, rng } from './mesh.js'
import * as S from './sdf.js'

const sdfMesh = (f, bounds, res) => new MeshBuilder().addRaw(S.polygonize(f, bounds, res))
const clamp01 = (v) => Math.max(0, Math.min(1, v))

/* ------------------------------ respiratorio ------------------------------ */

function lungs() {
  const mb = new MeshBuilder()
  for (const side of [-1, 1]) {
    const cx = side * (side < 0 ? 0.074 : 0.071)
    const cy = 1.288, cz = 0.01
    const E = S.ellipsoid([cx, cy, cz], [side < 0 ? 0.062 : 0.058, 0.128, 0.07])
    // más estrecho hacia el vértice pulmonar
    const body = (x, y, z) => {
      const t = clamp01((y - 1.2) / 0.22)
      const k = 1 - 0.42 * t * t
      return E(cx + (x - cx) / k, y, cz + (z - cz) / k) * k
    }
    let f = S.subtract(0.025, body, S.sphere([side * 0.06, 1.07, 0.012], 0.12)) // cúpula diafragmática
    f = S.subtract(0.02, f, S.roundBox([0, 1.29, 0.035], [0.028, 0.24, 0.075], 0.02)) // mediastino
    if (side > 0) f = S.subtract(0.015, f, S.ellipsoid([0.022, 1.245, 0.05], [0.06, 0.06, 0.05])) // escotadura cardíaca
    // cisuras: oblicua (ambos) y horizontal (derecho)
    const n = new Vector3(0, 0.75, 0.66).normalize()
    const p0 = [0, 1.27, 0.0]
    const oblique = (x, y, z) => (x - p0[0]) * n.x + (y - p0[1]) * n.y + (z - p0[2]) * n.z
    f = S.subtract(0.001, f, (x, y, z) => Math.abs(oblique(x, y, z)) - 0.0012)
    if (side < 0) {
      f = S.subtract(0.001, f, (x, y, z) => Math.max(Math.abs(y - 1.3) - 0.0012, -oblique(x, y, z)))
    }
    const xmin = side < 0 ? -0.145 : 0.0, xmax = side < 0 ? 0.0 : 0.14
    mb.merge(sdfMesh(f, { min: [xmin, 1.14, -0.07], max: [xmax, 1.43, 0.09] }, 0.0032))
  }
  return mb
}

function trachea() {
  const mb = new MeshBuilder()
  const path = curve([
    [0, 1.49, 0.031],
    [0, 1.45, 0.03],
    [0, 1.4, 0.022],
    [0, 1.36, 0.01],
    [0, 1.335, 0.002],
  ])
  tube(mb, path, 0.0078, { segments: 30, radial: 14 })
  // anillos cartilaginosos en forma de C (abiertos por detrás)
  const T = new Vector3(), P = new Vector3()
  for (let i = 0; i <= 17; i++) {
    const t = i / 17
    path.getPointAt(t, P)
    path.getTangentAt(t, T)
    const ring = curve(
      Array.from({ length: 13 }, (_, k) => {
        const a = -Math.PI * 0.8 + (k / 12) * Math.PI * 1.6
        const side = new Vector3(1, 0, 0)
        const fwd = new Vector3().crossVectors(side, T).normalize()
        return P.clone().addScaledVector(side, Math.sin(a) * 0.0086).addScaledVector(fwd, Math.cos(a) * 0.0086)
      }),
    )
    tube(mb, ring, 0.0016, { segments: 16, radial: 6 })
  }
  // laringe (cartílago tiroides y cricoides)
  mb.merge(
    sdfMesh(
      S.smooth(
        0.006,
        S.mirrorX(S.triangle([0.0, 1.525, 0.045], [0.018, 1.53, 0.024], [0.004, 1.5, 0.04], 0.0022)),
        S.torus([0, 1.494, 0.03], 0.0098, 0.0028),
        S.capsule([0, 1.528, 0.042], [0, 1.506, 0.042], 0.003),
      ),
      { min: [-0.03, 1.48, 0.01], max: [0.03, 1.545, 0.055] },
      0.0016,
    ),
  )
  // bronquios y árbol bronquial
  const R = rng(11)
  const branch = (a, dir, len, r, depth) => {
    const b = a.clone().addScaledVector(dir, len)
    const mid = a.clone().lerp(b, 0.5).add(new Vector3((R() - 0.5) * len * 0.15, (R() - 0.5) * len * 0.15, (R() - 0.5) * len * 0.15))
    tube(mb, [a, mid, b], (t) => r * (1 - t * 0.25), { segments: 8, radial: 7 })
    if (depth <= 0) return
    for (const s of [-1, 1]) {
      const axis = new Vector3(R() - 0.5, R() - 0.5, R() - 0.5).cross(dir).normalize()
      const nd = dir.clone().applyAxisAngle(axis, s * (0.45 + R() * 0.3)).normalize()
      nd.y -= 0.12
      nd.normalize()
      branch(b, nd, len * 0.74, r * 0.72, depth - 1)
    }
  }
  const carina = new Vector3(0, 1.335, 0.002)
  branch(carina, new Vector3(-0.72, -0.62, -0.1).normalize(), 0.032, 0.0066, 4)
  branch(carina, new Vector3(0.82, -0.5, -0.12).normalize(), 0.038, 0.006, 4)
  return mb
}

/* -------------------------------- digestivo -------------------------------- */

function esophagus() {
  const mb = new MeshBuilder()
  tube(
    mb,
    [
      [0, 1.535, 0.014],
      [0, 1.47, 0.012],
      [0.004, 1.4, 0.0],
      [0.008, 1.32, -0.012],
      [0.012, 1.24, -0.008],
      [0.022, 1.19, 0.006],
      [0.036, 1.168, 0.02],
    ],
    0.0072,
    { segments: 50, radial: 12, caps: true },
  )
  return mb
}

const STOMACH_PTS = [
  [0.036, 1.168, 0.02],
  [0.058, 1.172, 0.018],
  [0.08, 1.155, 0.022],
  [0.088, 1.12, 0.03],
  [0.078, 1.088, 0.04],
  [0.052, 1.072, 0.047],
  [0.022, 1.076, 0.05],
  [-0.004, 1.088, 0.047],
  [-0.022, 1.098, 0.042],
]
function stomach() {
  const radii = [0.012, 0.026, 0.031, 0.032, 0.03, 0.027, 0.021, 0.014, 0.008]
  const f = S.smooth(0.012, S.chain(STOMACH_PTS, radii), S.sphere([0.066, 1.182, 0.014], 0.025))
  return sdfMesh(f, { min: [-0.04, 1.03, -0.015], max: [0.125, 1.215, 0.1] }, 0.003)
}

function liver() {
  let f = S.smooth(
    0.04,
    S.ellipsoid([-0.052, 1.142, 0.018], [0.08, 0.055, 0.06]),
    S.ellipsoid([0.028, 1.16, 0.042], [0.064, 0.026, 0.042]),
  )
  f = S.subtract(0.02, f, S.ellipsoid([-0.03, 1.06, 0.035], [0.09, 0.05, 0.08]))
  f = S.subtract(0.01, f, S.ellipsoid([-0.052, 1.098, 0.066], [0.013, 0.024, 0.013])) // fosa de la vesícula
  return sdfMesh(f, { min: [-0.155, 1.07, -0.055], max: [0.1, 1.205, 0.1] }, 0.0034)
}

function gallbladder() {
  const f = S.roundCone([-0.05, 1.088, 0.07], [-0.056, 1.115, 0.058], 0.0105, 0.006)
  return sdfMesh(f, { min: [-0.075, 1.07, 0.055], max: [-0.03, 1.13, 0.1] }, 0.0018)
}

function pancreas() {
  const f = S.chain(
    [
      [-0.028, 1.088, 0.03],
      [0.008, 1.1, 0.02],
      [0.05, 1.112, 0.004],
      [0.085, 1.127, -0.016],
    ],
    [0.015, 0.0105, 0.0088, 0.006],
  )
  return sdfMesh(f, { min: [-0.05, 1.065, -0.03], max: [0.1, 1.145, 0.05] }, 0.0022)
}

function spleen() {
  const f = S.transform([0.094, 1.15, -0.034], [0.2, 0, 0.42], S.ellipsoid([0, 0, 0], [0.016, 0.042, 0.027]))
  return sdfMesh(f, { min: [0.07, 1.09, -0.08], max: [0.14, 1.21, 0.0] }, 0.0025)
}

function smallIntestine() {
  const pts = [
    [-0.022, 1.098, 0.042],
    [-0.04, 1.092, 0.032],
    [-0.046, 1.068, 0.026],
    [-0.03, 1.052, 0.022],
    [0.0, 1.056, 0.022],
    [0.022, 1.06, 0.028],
  ]
  const turns = 7
  for (let i = 0; i <= 160; i++) {
    const th = (i / 160) * turns * Math.PI
    const x = 0.068 * Math.sin(th + 0.25) * (0.88 + 0.12 * Math.cos(th * 0.71))
    const y = 1.038 - 0.098 * (i / 160) + 0.007 * Math.sin(th * 3.1)
    const z = 0.028 + 0.02 * Math.sin(th * 2.3 + 0.5) + 0.008 * Math.cos(th * 5.3)
    pts.push([x, y, z])
  }
  pts.push([-0.06, 0.935, 0.03], [-0.078, 0.948, 0.034])
  const mb = new MeshBuilder()
  tube(mb, curve(pts, 0.4), 0.0098, { segments: 1100, radial: 10, caps: true })
  return mb
}

function largeIntestine() {
  const pts = [
    [-0.086, 0.948, 0.034],
    [-0.096, 0.99, 0.024],
    [-0.099, 1.04, 0.024],
    [-0.09, 1.078, 0.04],
    [-0.05, 1.052, 0.054],
    [0.0, 1.045, 0.056],
    [0.05, 1.055, 0.054],
    [0.094, 1.095, 0.03],
    [0.1, 1.05, 0.006],
    [0.1, 0.99, 0.006],
    [0.09, 0.945, 0.02],
    [0.06, 0.926, 0.04],
    [0.026, 0.934, 0.02],
    [0.01, 0.915, -0.028],
    [0.0, 0.882, -0.052],
    [0.0, 0.848, -0.048],
  ]
  const mb = new MeshBuilder()
  tube(
    mb,
    curve(pts, 0.5),
    (t) => {
      const haustra = 1 + 0.14 * Math.abs(Math.sin(t * Math.PI * 58))
      const taper = t > 0.85 ? 1 - (t - 0.85) * 1.8 : 1
      return 0.0185 * haustra * taper
    },
    { segments: 700, radial: 14, caps: true },
  )
  // apéndice
  tube(mb, [[-0.086, 0.935, 0.034], [-0.079, 0.91, 0.042], [-0.069, 0.9, 0.036]], (t) => 0.0035 * (1 - t * 0.4), { segments: 16, radial: 8, caps: true })
  return mb
}

/* --------------------------------- urinario --------------------------------- */

function kidneys() {
  const kidney = (side) => {
    const c = [side * 0.064, side < 0 ? 1.068 : 1.083, -0.045]
    let f = S.transform(c, [0, 0, side * 0.18], S.ellipsoid([0, 0, 0], [0.024, 0.05, 0.019]))
    f = S.subtract(0.008, f, S.sphere([side * 0.038, c[1] - 0.004, -0.035], 0.012))
    // glándula suprarrenal
    f = S.smooth(0.004, f, S.ellipsoid([side * 0.054, c[1] + 0.054, -0.045], [0.014, 0.008, 0.009]))
    return f
  }
  const mb = new MeshBuilder()
  mb.merge(sdfMesh(kidney(-1), { min: [-0.1, 1.0, -0.075], max: [-0.025, 1.14, -0.015] }, 0.0024))
  mb.merge(sdfMesh(kidney(1), { min: [0.025, 1.015, -0.075], max: [0.1, 1.155, -0.015] }, 0.0024))
  return mb
}

function bladder() {
  const mb = sdfMesh(S.ellipsoid([0, 0.9, 0.04], [0.03, 0.026, 0.026]), { min: [-0.04, 0.865, 0.005], max: [0.04, 0.935, 0.075] }, 0.0025)
  // uréteres
  for (const s of [-1, 1]) {
    tube(
      mb,
      [
        [s * 0.04, s < 0 ? 1.062 : 1.077, -0.036],
        [s * 0.04, 1.0, -0.022],
        [s * 0.046, 0.94, -0.006],
        [s * 0.032, 0.905, 0.024],
        [s * 0.016, 0.9, 0.036],
      ],
      0.0024,
      { segments: 40, radial: 8 },
    )
  }
  return mb
}

/* --------------------------------- endocrino --------------------------------- */

function thyroid() {
  const f = S.smooth(
    0.006,
    S.mirrorX(S.ellipsoid([0.0165, 1.468, 0.031], [0.0085, 0.019, 0.009])),
    S.capsule([-0.01, 1.457, 0.038], [0.01, 1.457, 0.038], 0.0048),
  )
  return sdfMesh(f, { min: [-0.035, 1.44, 0.015], max: [0.035, 1.495, 0.05] }, 0.0016)
}

export function buildOrgans(progress) {
  const parts = []
  const add = (id, mb) => {
    parts.push({ id, layer: 'organos', mesh: mb })
    progress?.(id)
  }
  add('pulmones', lungs())
  add('traquea', trachea())
  add('esofago', esophagus())
  add('estomago', stomach())
  add('higado', liver())
  add('vesicula', gallbladder())
  add('pancreas', pancreas())
  add('bazo', spleen())
  add('intestino-delgado', smallIntestine())
  add('intestino-grueso', largeIntestine())
  add('rinones', kidneys())
  add('vejiga', bladder())
  add('tiroides', thyroid())
  return parts
}
