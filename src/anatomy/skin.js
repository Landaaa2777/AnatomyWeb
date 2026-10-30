/**
 * Capa: piel. Superficie continua del cuerpo modelada como SDF (uniones suaves) y
 * convertida en malla por regiones: cuerpo, cabeza, manos y pies (más detalle donde hace falta).
 */
import { MeshBuilder } from './mesh.js'
import * as S from './sdf.js'
import { L, TORSO_PROFILE, torsoAt, alongArm, alongForearm, alongHand } from './landmarks.js'
import { HAND, FOOT } from './extremities.js'
import { skullOuter } from './skeleton.js'

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// rotaciones (eje z) del brazo y del antebrazo en posición anatómica
const ARM_ROT = [0, 0, 0.419]
const FOREARM_ROT = [0, 0, 0.488]
const rotEllipsoid = (c, r, rot) => S.transform(c, rot, S.ellipsoid([0, 0, 0], r))

const frontZ = (y) => {
  const { b, cz } = torsoAt(y)
  return cz + b
}
const backZ = (y) => {
  const { b, cz } = torsoAt(y)
  return cz - b
}

/** Esternocleidomastoideo: relieve en diagonal a cada lado del cuello. */
const scmRidge = (shrink = 0) => S.mirrorX(S.capsule([0.058, 1.585, -0.016], [0.024, 1.432, 0.058], 0.0135 - shrink))

function bodySDF() {
  const torso = S.loft(TORSO_PROFILE)
  const side = S.smooth(
    0.03,
    // hombro / deltoides
    S.ellipsoid([0.196, 1.402, 0.0], [0.058, 0.06, 0.06]),
    S.capsule([0.03, 1.415, 0.072], [0.17, 1.448, 0.0], 0.014),
    // brazo y antebrazo
    S.roundCone(alongArm(0.08, 0.004, 0.0), L.elbow, 0.047, 0.036),
    S.roundCone(L.elbow, alongForearm(0.3, 0.0, 0.002), 0.036, 0.039),
    S.roundCone(alongForearm(0.3, 0.0, 0.002), alongForearm(0.98, 0.0, 0.0), 0.039, 0.028),
    // relieve del trapecio, escápula y pliegues axilares
    S.roundCone([0.0, 1.55, -0.035], [0.16, 1.448, -0.02], 0.044, 0.03),
    S.ellipsoid([0.12, 1.38, -0.058], [0.07, 0.07, 0.045]),
    S.ellipsoid([0.14, 1.36, 0.042], [0.05, 0.04, 0.035]),
    // tendón de Aquiles
    S.roundCone([0.09, 0.2, -0.03], [0.09, 0.07, -0.045], 0.022, 0.015),
    // glúteos
    S.ellipsoid([0.07, 0.88, -0.068], [0.075, 0.075, 0.055]),
    // muslo, rodilla y pierna
    S.roundCone([0.088, 0.86, -0.002], [0.095, 0.47, 0.004], 0.087, 0.05),
    S.roundCone([0.095, 0.47, 0.004], [0.095, 0.33, -0.014], 0.05, 0.054),
    S.roundCone([0.095, 0.33, -0.014], [0.09, 0.085, -0.004], 0.054, 0.031),
  )
  const neck = S.roundCone([0, 1.42, -0.01], [0, 1.56, -0.006], 0.063, 0.054)
  const throat = S.roundCone([0, 1.43, 0.02], [0, 1.53, 0.015], 0.05, 0.045)
  const base = S.smooth(0.035, torso, S.mirrorX(side), neck, throat)

  // relieve muscular esculpido (como en las figuras anatómicas de estudio)
  // cada grupo se acota a su caja para no evaluarlo en todo el volumen
  const torsoSculpt = S.bound(
    S.union(
      // pectorales
      rotEllipsoid([0.074, 1.322, 0.08], [0.068, 0.052, 0.03], [0, 0, 0.18]),
      // abdominales ("tableta")
      ...[1.19, 1.135, 1.08, 1.025].map((y, i) =>
        S.ellipsoid([0.021, y, frontZ(y) - 0.0075], [0.0185, i === 3 ? 0.028 : 0.023, 0.0115]),
      ),
      // oblicuo / cresta ilíaca ("líneas de Apolo")
      S.capsule([0.125, 1.03, frontZ(1.03) - 0.05], [0.05, 0.9, frontZ(0.9) - 0.012], 0.014),
    ),
    { min: [0, 0.88, -0.02], max: [0.16, 1.4, 0.13] },
  )
  const armSculpt = S.bound(
    S.union(
      // bíceps, tríceps y antebrazo
      rotEllipsoid(alongArm(0.52, 0.0, 0.017), [0.026, 0.058, 0.028], ARM_ROT),
      rotEllipsoid(alongArm(0.4, 0.0, -0.015), [0.028, 0.07, 0.026], ARM_ROT),
      rotEllipsoid(alongForearm(0.25, -0.006, 0.006), [0.029, 0.055, 0.025], FOREARM_ROT),
      rotEllipsoid(alongForearm(0.18, 0.012, 0.002), [0.022, 0.05, 0.022], FOREARM_ROT),
    ),
    { min: [0.19, 0.98, -0.05], max: [0.42, 1.37, 0.06] },
  )
  const legSculpt = S.bound(
    S.union(
      // cuádriceps, vasto medial, isquiotibiales, rótula y gemelos
      S.ellipsoid([0.108, 0.7, 0.03], [0.05, 0.14, 0.05]),
      S.ellipsoid([0.072, 0.535, 0.028], [0.03, 0.045, 0.03]),
      S.ellipsoid([0.092, 0.66, -0.032], [0.05, 0.13, 0.045]),
      S.ellipsoid([0.097, 0.482, 0.05], [0.02, 0.026, 0.012]),
      S.ellipsoid([0.08, 0.37, -0.034], [0.031, 0.075, 0.032]),
      S.ellipsoid([0.11, 0.385, -0.03], [0.032, 0.068, 0.032]),
    ),
    { min: [0.03, 0.28, -0.08], max: [0.17, 0.86, 0.09] },
  )
  const sculpt = S.mirrorX(S.union(torsoSculpt, armSculpt, legSculpt))
  let f = S.smooth(0.012, base, sculpt, S.bound(scmRidge(), { min: [-0.08, 1.41, -0.04], max: [0.08, 1.6, 0.08] }))
  // surcos: línea alba, ombligo, surco esternal y columna
  const alba = S.chain([1.235, 1.15, 1.06, 0.99].map((y) => [0, y, frontZ(y) + 0.002]), 0.0028)
  f = S.subtract(0.007, f, alba)
  f = S.subtract(0.004, f, S.ellipsoid([0, 0.992, frontZ(0.992) + 0.002], [0.0045, 0.0065, 0.007]))
  f = S.subtract(0.008, f, S.chain([1.37, 1.3, 1.24].map((y) => [0, y, frontZ(y) + 0.012]), 0.005))
  f = S.subtract(0.012, f, S.chain([1.42, 1.3, 1.18, 1.06, 0.98].map((y) => [0, y, backZ(y) - 0.0012]), 0.0045))
  return f
}

function headSDF() {
  // volumen base de la cabeza (cráneo, macizo facial, mandíbula y mentón) con transiciones suaves
  const base = S.smooth(
    0.04,
    S.ellipsoid([0, 1.655, -0.014], [0.079, 0.095, 0.101]),
    S.ellipsoid([0, 1.605, 0.04], [0.064, 0.062, 0.056]),
    S.ellipsoid([0, 1.556, 0.034], [0.05, 0.04, 0.05]),
    S.ellipsoid([0, 1.526, 0.075], [0.02, 0.015, 0.014]),
    // frente
    S.ellipsoid([0, 1.668, 0.03], [0.06, 0.06, 0.066]),
    // cuello algo más fino que el del cuerpo para que no coincidan las superficies
    S.roundCone([0, 1.42, -0.01], [0, 1.56, -0.006], 0.0624, 0.0534),
  )
  // relieves óseos que se notan bajo la piel: bóveda, arcos superciliares, pómulos y línea mandibular
  const bones = S.union(
    S.offset(skullOuter({ vaultOnly: true }), 0.005),
    S.mirrorX(S.capsule([0.02, 1.655, 0.08], [0.042, 1.654, 0.074], 0.0095)),
    S.mirrorX(S.ellipsoid([0.051, 1.613, 0.054], [0.018, 0.017, 0.019])),
    S.mirrorX(
      S.chain(
        [
          [0.051, 1.598, -0.015],
          [0.048, 1.56, -0.011],
          [0.0455, 1.536, -0.002],
          [0.04, 1.528, 0.025],
          [0.025, 1.522, 0.055],
          [0, 1.519, 0.07],
        ],
        [0.0105, 0.0112, 0.0118, 0.013, 0.0145, 0.0155],
      ),
    ),
  )
  const head = S.smooth(0.016, base, bones, scmRidge(0.0006))
  const ear = S.transform(
    [0.077, 1.621, -0.024],
    [0, 0.25, 0],
    S.subtract(0.004, S.smooth(0.004, S.ellipsoid([0, 0, 0], [0.0075, 0.029, 0.017]), S.sphere([0, -0.024, 0.003], 0.0072)), S.ellipsoid([0.006, -0.003, 0.002], [0.004, 0.011, 0.007])),
  )
  const features = S.smooth(
    0.006,
    // nariz: dorso, punta y aletas
    S.roundCone([0, 1.644, 0.091], [0, 1.604, 0.113], 0.0065, 0.009),
    S.sphere([0, 1.6, 0.1125], 0.0095),
    S.mirrorX(S.ellipsoid([0.0105, 1.596, 0.102], [0.0075, 0.0068, 0.0075])),
    // labios
    S.ellipsoid([0, 1.5625, 0.089], [0.021, 0.0058, 0.0085]),
    S.ellipsoid([0, 1.5495, 0.0865], [0.018, 0.0055, 0.008]),
    // cejas y orejas
    S.mirrorX(S.capsule([0.012, 1.659, 0.092], [0.044, 1.661, 0.083], 0.0045)),
    S.mirrorX(ear),
  )
  let f = S.smooth(0.008, head, features)
  // cuencas de los ojos con párpados (estilo escultura), fosas nasales y línea de la boca
  f = S.subtract(0.014, f, S.mirrorX(S.ellipsoid([0.032, 1.634, 0.104], [0.019, 0.012, 0.02])))
  f = S.smooth(0.004, f, S.mirrorX(S.sphere([0.032, 1.632, 0.071], 0.0128)))
  f = S.subtract(0.002, f, S.mirrorX(S.ellipsoid([0.0058, 1.5905, 0.106], [0.0032, 0.0022, 0.0042])))
  f = S.subtract(0.002, f, S.capsule([-0.019, 1.5562, 0.0975], [0.019, 1.5562, 0.0975], 0.0018))
  return f
}

function handSDF() {
  const parts = [
    S.roundCone(alongForearm(0.86, 0.0, 0.0), alongHand(0.005, 0, 0), 0.0275, 0.0255),
    S.roundBox(alongHand(0.05, 0.002, 0.003), [0.038, 0.04, 0.013], 0.011, [0, 0, -Math.atan2(0.4, 0.915)]),
  ]
  const fr = [0.0085, 0.0088, 0.0083, 0.0074]
  HAND.fingers.forEach((pts, i) => {
    const fp = []
    for (let k = 1; k < pts.length - 1; k++) fp.push(S.roundCone(pts[k], pts[k + 1], fr[i] * (1 - (k - 1) * 0.08), fr[i] * (1 - k * 0.1)))
    parts.push(S.bound(S.smooth(0.004, ...fp), S.bbox(pts.slice(1), 0.012)))
  })
  const t = HAND.thumb
  parts.push(S.roundCone(lerp3(t[0], t[1], 0.2), t[1], 0.013, 0.0098), S.roundCone(t[1], t[2], 0.0098, 0.009), S.roundCone(t[2], t[3], 0.009, 0.0078))
  return S.smooth(0.006, ...parts)
}

function footSDF() {
  const { fp, toes } = FOOT
  const parts = [
    S.roundCone([0.09, 0.12, -0.006], [0.09, 0.06, -0.008], 0.031, 0.03),
    S.roundCone(fp(0.03, 0.002, 0.03), fp(0.12, 0.0, 0.03), 0.032, 0.03),
    S.roundBox(fp(0.135, 0.0, 0.017), [0.042, 0.018, 0.035], 0.014, [0, 0.14, 0]),
    S.ellipsoid(fp(0.03, 0.004, 0.026), [0.03, 0.026, 0.04]),
    // maléolos y tendón de Aquiles
    S.ellipsoid([0.118, 0.07, -0.015], [0.012, 0.018, 0.014]),
    S.ellipsoid([0.07, 0.07, -0.004], [0.011, 0.016, 0.013]),
    S.roundCone([0.09, 0.12, -0.04], [0.089, 0.035, -0.06], 0.016, 0.016),
  ]
  toes.forEach((pts, i) => {
    const r = i === 0 ? 0.0105 : 0.0072 - i * 0.0004
    parts.push(S.roundCone(pts[0], pts[1], r + 0.003, r + 0.001))
    parts.push(S.roundCone(pts[1], pts[pts.length - 1], r, r * 0.85))
  })
  return S.smooth(0.01, ...parts)
}

export const SKIN_SDFS = () => [bodySDF(), headSDF(), handSDF(), footSDF()]

export function buildSkin(progress) {
  const mb = new MeshBuilder()
  // cuerpo (sin manos, pies ni cabeza)
  mb.addRaw(S.polygonize(bodySDF(), { min: [-0.455, 0.07, -0.14], max: [0.455, 1.55, 0.135] }, 0.0067, { ao: 'grid' }))
  progress?.('piel-cuerpo')
  mb.addRaw(S.polygonize(headSDF(), { min: [-0.095, 1.5, -0.125], max: [0.095, 1.758, 0.13] }, 0.0028, { ao: 'grid' }))
  progress?.('piel-cabeza')
  const hand = new MeshBuilder().addRaw(S.polygonize(handSDF(), S.bbox([alongForearm(0.86), ...HAND.fingers.flat(), ...HAND.thumb], 0.016), 0.0026, { ao: 'grid' }))
  mb.merge(hand.bilateral())
  const foot = new MeshBuilder().addRaw(S.polygonize(footSDF(), { min: [0.04, -0.005, -0.1], max: [0.16, 0.16, 0.21] }, 0.003, { ao: 'grid' }))
  mb.merge(foot.bilateral())
  progress?.('piel')
  return [{ id: 'piel', layer: 'piel', mesh: mb }]
}
