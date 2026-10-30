/** Capa: sistema nervioso (encéfalo, médula, nervios periféricos y ojos). */
import { Vector3 } from 'three'
import { MeshBuilder, tube } from './mesh.js'
import * as S from './sdf.js'
import { alongArm, alongForearm, alongHand, ARM, VERTEBRAE, spineZ } from './landmarks.js'
import { HAND, FOOT } from './extremities.js'
import { ribPoints } from './skeleton.js'

const sdfMesh = (f, bounds, res) => new MeshBuilder().addRaw(S.polygonize(f, bounds, res))
const nerve = (mb, pts, r0, r1 = r0 * 0.6, seg) =>
  tube(mb, pts, (t) => r0 + (r1 - r0) * t, { segments: seg ?? Math.max(10, pts.length * 7), radial: 7, caps: true })

/** Punto del conducto vertebral a la altura y. */
function canal(y, lateral = 0) {
  const v = VERTEBRAE.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a))
  return [lateral, y, spineZ(y) - v.r - 0.0068]
}

/* --------------------------------- encéfalo --------------------------------- */

function cerebrum() {
  const hemi = S.smooth(
    0.02,
    S.ellipsoid([0.032, 1.666, -0.01], [0.034, 0.058, 0.082]),
    S.ellipsoid([0.046, 1.626, 0.0], [0.022, 0.024, 0.044]),
  )
  // la cara inferior del lóbulo frontal descansa sobre el techo de las órbitas
  const both = S.subtract(0.012, S.mirrorX(hemi), S.mirrorX(S.ellipsoid([0.033, 1.616, 0.062], [0.028, 0.022, 0.036])))
  // circunvoluciones: crestas sinuosas que se cruzan
  const gyri = (x, y, z) => {
    const u = 120 * x + 2.6 * Math.sin(55 * y + 1.7) + 2.2 * Math.sin(70 * z)
    const v = 120 * z + 2.4 * Math.sin(60 * x) + 2.0 * Math.sin(50 * y + 0.5)
    const w = 120 * y + 2.0 * Math.sin(65 * z) + 1.8 * Math.sin(45 * x)
    const su = Math.sin(u), sv = Math.sin(v), sw = Math.sin(w)
    return 0.0021 * (Math.abs(su * sv) + Math.abs(sv * sw) + Math.abs(sw * su)) - 0.0016
  }
  const f = (x, y, z) => {
    const d = both(x, y, z)
    const fissure = 0.0016 - Math.abs(x)
    return Math.max(d + (Math.abs(d) < 0.01 ? gyri(x, y, z) : 0), fissure)
  }
  return sdfMesh(f, { min: [-0.075, 1.59, -0.1], max: [0.075, 1.73, 0.08] }, 0.0021)
}

function cerebellum() {
  const base = S.mirrorX(S.ellipsoid([0.022, 1.605, -0.05], [0.028, 0.02, 0.026]))
  const f = (x, y, z) => {
    const d = base(x, y, z)
    return Math.abs(d) < 0.006 ? d + 0.0009 * Math.sin(y * 650 + z * 160) : d
  }
  return sdfMesh(f, { min: [-0.06, 1.57, -0.1], max: [0.06, 1.63, -0.025] }, 0.0016)
}

function brainstem() {
  const f = S.smooth(
    0.006,
    S.roundCone([0, 1.635, -0.018], [0, 1.565, -0.024], 0.011, 0.0085),
    S.ellipsoid([0, 1.606, -0.012], [0.014, 0.013, 0.012]),
    S.mirrorX(S.ellipsoid([0.006, 1.64, -0.016], [0.008, 0.01, 0.012])),
  )
  return sdfMesh(f, { min: [-0.03, 1.55, -0.045], max: [0.03, 1.66, 0.01] }, 0.0018)
}

function eyes() {
  const side = sdfMesh(
    S.smooth(0.002, S.sphere([0.032, 1.632, 0.07], 0.0115), S.sphere([0.032, 1.632, 0.08], 0.0055)),
    { min: [0.015, 1.615, 0.055], max: [0.05, 1.65, 0.095] },
    0.0012,
  )
  nerve(side, [[0.032, 1.632, 0.058], [0.024, 1.63, 0.045], [0.012, 1.627, 0.032], [0.0, 1.625, 0.022]], 0.0022, 0.0018)
  return side.bilateral()
}

/* --------------------------------- médula --------------------------------- */

function spinalCord() {
  const mb = new MeshBuilder()
  const pts = []
  for (let y = 1.575; y >= 1.11; y -= 0.015) pts.push(canal(y))
  tube(mb, pts, (t) => (t < 0.85 ? 0.0046 - t * 0.0008 : 0.0039 * (1 - (t - 0.85) * 4.5)), { segments: 90, radial: 10, caps: true })
  // cola de caballo
  for (let i = 0; i < 8; i++) {
    const l = (i - 3.5) * 0.0016
    const ps = []
    for (let y = 1.12; y >= 0.94; y -= 0.02) ps.push(canal(y, l * (1 + (1.12 - y) * 4)))
    ps.push([l * 3, 0.925, -0.075])
    nerve(mb, ps, 0.0011, 0.0008)
  }
  return mb
}

function spinalNerves() {
  const side = new MeshBuilder()
  for (const v of VERTEBRAE) {
    const c = canal(v.y - v.h * 0.55)
    const foramen = [0.022, c[1] - 0.004, c[2] + 0.004]
    nerve(side, [[0.003, c[1], c[2]], [0.012, c[1] - 0.002, c[2] + 0.002], foramen], 0.0019, 0.0017, 8)
    if (v.group === 'T') {
      // nervio intercostal bajo su costilla
      const k = +v.name.slice(1)
      const rib = ribPoints(k).map((p) => [p[0], p[1] - 0.0085, p[2]])
      nerve(side, [foramen, ...rib.slice(1, k <= 10 ? -1 : undefined)], 0.0015, 0.0009)
    } else if (v.group === 'C' && +v.name.slice(1) <= 4) {
      nerve(side, [foramen, [0.032, c[1] - 0.008, c[2] + 0.015], [0.04, c[1] - 0.02, c[2] + 0.028]], 0.0014, 0.0008)
    } else if (v.group === 'L' && +v.name.slice(1) <= 2) {
      nerve(side, [foramen, [0.07, c[1] - 0.03, c[2] + 0.01], [0.12, c[1] - 0.06, c[2] + 0.04], [0.1, c[1] - 0.1, 0.07]], 0.0015, 0.0009)
    }
  }
  // raíces sacras
  for (let i = 0; i < 4; i++) {
    const y = 0.97 - i * 0.02
    nerve(side, [[0.004, y + 0.01, -0.072], [0.016, y + 0.004, -0.08], [0.035, y - 0.01, -0.075]], 0.0018, 0.0016, 8)
  }
  return side.bilateral()
}

/* --------------------------------- periféricos --------------------------------- */

function digital(mb, finger, offset, r) {
  const off = ARM.Z.clone().multiplyScalar(offset).addScaledVector(ARM.latH, 0.0025)
  nerve(mb, finger.slice(1).map((p) => new Vector3(...p).add(off)), r, r * 0.5)
}

function armNerves() {
  const side = new MeshBuilder()
  const plexus = [0.19, 1.362, 0.004]
  for (let i = 0; i < 5; i++) {
    const y = 1.505 - i * 0.017
    const c = canal(y)
    nerve(side, [[0.022, y - 0.004, c[2] + 0.004], [0.06, y - 0.015, 0.002], [0.12, 1.405 - i * 0.004, 0.0], plexus], 0.0024, 0.0028)
  }
  // mediano
  nerve(side, [plexus, alongArm(0.3, -0.012, 0.016), alongArm(0.95, -0.006, 0.018), alongForearm(0.3, 0.0, 0.014), alongForearm(0.95, 0.0, 0.012), alongHand(0.04, 0.002, 0.01)], 0.0026, 0.0018, 70)
  // cubital (por detrás del epicóndilo medial)
  nerve(side, [plexus, alongArm(0.3, -0.02, 0.006), alongArm(0.98, -0.031, -0.009), alongForearm(0.3, -0.016, 0.008), alongForearm(0.95, -0.017, 0.01), alongHand(0.04, -0.016, 0.009)], 0.0024, 0.0017, 70)
  // radial (en espiral por detrás del húmero)
  nerve(side, [plexus, alongArm(0.25, -0.01, -0.016), alongArm(0.5, 0.008, -0.021), alongArm(0.75, 0.021, -0.006), alongArm(0.95, 0.019, 0.014), alongForearm(0.5, 0.021, 0.008), alongForearm(0.95, 0.02, -0.002), alongHand(0.04, 0.012, -0.007)], 0.0026, 0.0015, 70)
  // musculocutáneo y axilar
  nerve(side, [plexus, alongArm(0.15, 0.0, 0.017), alongArm(0.6, 0.006, 0.022), alongForearm(0.3, 0.024, 0.012)], 0.0018, 0.0012)
  nerve(side, [plexus, alongArm(0.1, -0.006, -0.012), [0.215, 1.38, -0.022], [0.222, 1.365, 0.008]], 0.0018, 0.0012)
  HAND.fingers.forEach((f, i) => digital(side, f, i < 2 ? 0.003 : 0.0032, 0.0011))
  nerve(side, [alongHand(0.03, 0.012, 0.008), ...HAND.thumb.slice(1)], 0.0011, 0.0006)
  return side.bilateral()
}

function sciatic() {
  const { fp } = FOOT
  const side = new MeshBuilder()
  for (let i = 0; i < 4; i++) {
    const y = 0.97 - i * 0.02
    nerve(side, [[0.035, y - 0.01, -0.075], [0.05, 0.925, -0.07], [0.07, 0.897, -0.066]], 0.0022, 0.0034, 10)
  }
  nerve(side, [[0.07, 0.897, -0.066], [0.1, 0.84, -0.062], [0.1, 0.7, -0.047], [0.095, 0.56, -0.041], [0.095, 0.53, -0.039]], 0.005, 0.0045)
  // tibial
  nerve(side, [[0.095, 0.53, -0.039], [0.092, 0.46, -0.036], [0.088, 0.3, -0.031], [0.079, 0.15, -0.026], [0.072, 0.075, -0.026], fp(0.07, -0.004, 0.012)], 0.0034, 0.0022, 60)
  nerve(side, [fp(0.07, -0.004, 0.012), fp(0.12, -0.016, 0.008), fp(0.17, -0.022, 0.007)], 0.0016, 0.0008)
  nerve(side, [fp(0.07, -0.004, 0.012), fp(0.11, 0.012, 0.008), fp(0.16, 0.016, 0.007)], 0.0015, 0.0008)
  // peroneo común → profundo y superficial
  nerve(side, [[0.095, 0.53, -0.039], [0.118, 0.46, -0.03], [0.131, 0.41, -0.006], [0.112, 0.3, 0.012], [0.1, 0.12, 0.013], [0.095, 0.078, 0.011], fp(0.12, -0.005, 0.036), fp(0.19, -0.015, 0.022)], 0.0028, 0.0011, 60)
  nerve(side, [[0.131, 0.41, -0.006], [0.124, 0.3, 0.002], [0.11, 0.12, 0.014], [0.098, 0.08, 0.016], fp(0.13, 0.015, 0.034), fp(0.18, 0.02, 0.022)], 0.0018, 0.001)
  return side.bilateral()
}

function femoralNerve() {
  const side = new MeshBuilder()
  for (let i = 0; i < 3; i++) {
    const y = 1.1 - i * 0.03
    const c = canal(y)
    nerve(side, [[0.022, y - 0.004, c[2] + 0.004], [0.045, y - 0.03, 0.0], [0.06, 0.98, 0.008]], 0.0018, 0.0024, 10)
  }
  nerve(side, [[0.06, 0.98, 0.008], [0.075, 0.94, 0.03], [0.092, 0.895, 0.052], [0.095, 0.86, 0.052]], 0.0032, 0.003)
  nerve(side, [[0.095, 0.86, 0.052], [0.112, 0.75, 0.058], [0.112, 0.6, 0.052]], 0.0018, 0.001)
  nerve(side, [[0.095, 0.86, 0.052], [0.1, 0.72, 0.065], [0.098, 0.56, 0.058]], 0.0018, 0.001)
  nerve(side, [[0.095, 0.86, 0.052], [0.13, 0.78, 0.035], [0.14, 0.62, 0.025]], 0.0016, 0.001)
  // safeno
  nerve(side, [[0.095, 0.86, 0.052], [0.085, 0.72, 0.035], [0.074, 0.58, 0.004], [0.066, 0.45, -0.01], [0.066, 0.25, 0.006], [0.068, 0.09, 0.016]], 0.0016, 0.001, 50)
  return side.bilateral()
}

export function buildNervous(progress) {
  const parts = []
  const add = (id, mb) => {
    parts.push({ id, layer: 'nervioso', mesh: mb })
    progress?.(id)
  }
  add('cerebro', cerebrum())
  add('cerebelo', cerebellum())
  add('tronco-encefalico', brainstem())
  add('ojos', eyes())
  add('medula-espinal', spinalCord())
  add('nervios-espinales', spinalNerves())
  add('nervios-brazo', armNerves())
  add('nervio-ciatico', sciatic())
  add('nervio-femoral', femoralNerve())
  return parts
}
