/**
 * Superficies implícitas (SDF) + marching cubes.
 *
 * Las formas orgánicas (piel, cráneo, pelvis, escápula, órganos) se modelan como
 * funciones de distancia con signo combinadas mediante uniones suaves, y luego se
 * convierten en malla con marching cubes. Así se obtienen superficies continuas
 * sin costuras, algo difícil de lograr uniendo primitivas.
 */
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js'
import { Matrix4, Quaternion, Euler, Vector3 } from 'three'

/* ---------------------------- primitivas ---------------------------- */

export const sphere = (c, r) => (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r

export const ellipsoid = (c, r) => (x, y, z) => {
  const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2]
  const k0 = Math.hypot(px, py, pz)
  const k1 = Math.hypot(px / r[0], py / r[1], pz / r[2])
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1
}

/** Cono redondeado (cápsula con radios distintos en cada extremo). */
export const roundCone = (a, b, r1, r2 = r1) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2]
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2]
    const yy = pax * bax + pay * bay + paz * baz
    const zz = yy - l2
    const cx = pax * l2 - bax * yy, cy = pay * l2 - bay * yy, cz = paz * l2 - baz * yy
    const x2 = cx * cx + cy * cy + cz * cz
    const y2 = yy * yy * l2
    const z2 = zz * zz * l2
    const k = Math.sign(rr) * rr * rr * x2
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1
  }
}

export const capsule = (a, b, r) => roundCone(a, b, r, r)

/** Distancia a una caja redondeada centrada en el origen (coordenadas locales). */
export function boxDist(x, y, z, hx, hy, hz, round = 0) {
  const qx = Math.abs(x) - hx + round, qy = Math.abs(y) - hy + round, qz = Math.abs(z) - hz + round
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round
}

/** Caja redondeada con rotación opcional. */
export const roundBox = (c, half, round = 0, rot = [0, 0, 0]) =>
  transform(c, rot, (x, y, z) => boxDist(x, y, z, half[0], half[1], half[2], round))

export const torus = (c, R, r, rot = [0, 0, 0]) =>
  transform(c, rot, (x, y, z) => Math.hypot(Math.hypot(x, z) - R, y) - r)

/** Triángulo con grosor (placas óseas como la escápula). */
export const triangle = (A, B, C, thickness) => {
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2]
  const ba = sub(B, A), cb = sub(C, B), ac = sub(A, C)
  const nor = cross(ba, ac)
  const cba = cross(ba, nor), ccb = cross(cb, nor), cac = cross(ac, nor)
  const dba = dot(ba, ba), dcb = dot(cb, cb), dac = dot(ac, ac), dnor = dot(nor, nor)
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const seg = (e, pe, de) => {
    const t = clamp(dot(e, pe) / de)
    const x = e[0] * t - pe[0], y = e[1] * t - pe[1], z = e[2] * t - pe[2]
    return x * x + y * y + z * z
  }
  return (x, y, z) => {
    const pa = [x - A[0], y - A[1], z - A[2]]
    const pb = [x - B[0], y - B[1], z - B[2]]
    const pc = [x - C[0], y - C[1], z - C[2]]
    const s = Math.sign(dot(cba, pa)) + Math.sign(dot(ccb, pb)) + Math.sign(dot(cac, pc))
    const d2 = s < 2 ? Math.min(seg(ba, pa, dba), seg(cb, pb, dcb), seg(ac, pc, dac)) : (dot(nor, pa) * dot(nor, pa)) / dnor
    return Math.sqrt(d2) - thickness
  }
}

/**
 * Caja redondeada orientada a lo largo del segmento a→b (placas óseas, cuerpo mandibular…).
 * halfH: semialtura en la dirección `up`; halfT: semigrosor perpendicular a ambos.
 */
export const segBox = (a, b, halfH, halfT, round = 0, up = [0, 1, 0]) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const len = Math.hypot(...u)
  u[0] /= len; u[1] /= len; u[2] /= len
  const d = up[0] * u[0] + up[1] * u[1] + up[2] * u[2]
  const v = [up[0] - d * u[0], up[1] - d * u[1], up[2] - d * u[2]]
  const lv = Math.hypot(...v)
  v[0] /= lv; v[1] /= lv; v[2] /= lv
  const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const halfL = len / 2 + halfT
  return (x, y, z) => {
    const px = x - c[0], py = y - c[1], pz = z - c[2]
    return boxDist(
      px * u[0] + py * u[1] + pz * u[2],
      px * v[0] + py * v[1] + pz * v[2],
      px * w[0] + py * w[1] + pz * w[2],
      halfL,
      halfH,
      halfT,
      round,
    )
  }
}

/** Distancia aproximada a una elipse 2D de semiejes a, b. */
export function ellipse2(u, w, a, b) {
  const k0 = Math.hypot(u / a, w / b)
  const k1 = Math.hypot(u / (a * a), w / (b * b))
  return k1 === 0 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1
}

/** Cadena de conos redondeados a través de una lista de puntos [x,y,z] con radios. */
export const chain = (points, radii) => {
  const parts = []
  for (let i = 0; i < points.length - 1; i++) {
    const r0 = Array.isArray(radii) ? radii[i] : radii
    const r1 = Array.isArray(radii) ? radii[i + 1] : radii
    parts.push(roundCone(points[i], points[i + 1], r0, r1))
  }
  return union(...parts)
}

/** Caja envolvente de una lista de puntos con margen. */
export function bbox(points, pad = 0.02) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k] - pad)
      max[k] = Math.max(max[k], p[k] + pad)
    }
  }
  return { min, max }
}

/**
 * Acelera una SDF: fuera de su caja envolvente (más un margen) devuelve la distancia a la caja,
 * que es una cota inferior válida y mucho más barata de calcular.
 */
export const bound = (f, { min, max }, margin = 0.012) => (x, y, z) => {
  const dx = Math.max(min[0] - x, 0, x - max[0])
  const dy = Math.max(min[1] - y, 0, y - max[1])
  const dz = Math.max(min[2] - z, 0, z - max[2])
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
  return d > margin ? d : f(x, y, z)
}

/** Aplica traslación + rotación a una SDF definida en coordenadas locales. */
export function transform(c, rot, f, scale = [1, 1, 1]) {
  const inv = new Matrix4()
    .compose(new Vector3(...c), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(1, 1, 1))
    .invert()
  const e = inv.elements
  const s = Math.min(scale[0], scale[1], scale[2])
  return (x, y, z) => {
    const lx = (e[0] * x + e[4] * y + e[8] * z + e[12]) / scale[0]
    const ly = (e[1] * x + e[5] * y + e[9] * z + e[13]) / scale[1]
    const lz = (e[2] * x + e[6] * y + e[10] * z + e[14]) / scale[2]
    return f(lx, ly, lz) * s
  }
}

/**
 * "Loft": sección elíptica que varía a lo largo de y.
 * profile: [[y, semiancho, semiprofundidad, centroZ, centroX?], ...] ordenado por y.
 */
export function loft(profile) {
  const ys = profile.map((p) => p[0])
  const ymin = ys[0], ymax = ys[ys.length - 1]
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  }
  const sample = (y, k) => {
    if (y <= ymin) return profile[0][k] ?? 0
    if (y >= ymax) return profile[profile.length - 1][k] ?? 0
    let i = 0
    while (i < ys.length - 2 && y > ys[i + 1]) i++
    const t = (y - ys[i]) / (ys[i + 1] - ys[i])
    const g = (j) => profile[Math.max(0, Math.min(profile.length - 1, j))][k] ?? 0
    return cr(g(i - 1), g(i), g(i + 1), g(i + 2), t)
  }
  return (x, y, z) => {
    const a = sample(y, 1), b = sample(y, 2), cz = sample(y, 3), cx = sample(y, 4)
    const u = (x - cx) / a, w = (z - cz) / b
    const k0 = Math.hypot(u, w)
    const k1 = Math.hypot(u / a, w / b)
    const d = k1 === 0 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1
    const dy = Math.max(ymin - y, y - ymax)
    return dy > 0 ? Math.hypot(Math.max(d, 0), dy) : d
  }
}

/* ----------------------------- operaciones ----------------------------- */

export const union = (...fs) => (x, y, z) => {
  let d = Infinity
  for (let i = 0; i < fs.length; i++) {
    const v = fs[i](x, y, z)
    if (v < d) d = v
  }
  return d
}

const smin2 = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

export const smooth = (k, ...fs) => (x, y, z) => {
  let d = fs[0](x, y, z)
  for (let i = 1; i < fs.length; i++) d = smin2(d, fs[i](x, y, z), k)
  return d
}

/** Resta suave: a menos b. */
export const subtract = (k, a, b) => (x, y, z) => -smin2(-a(x, y, z), b(x, y, z), k)

export const intersect = (k, a, b) => (x, y, z) => -smin2(-a(x, y, z), -b(x, y, z), k)

/** Reflejo bilateral: evalúa la SDF con |x|. */
export const mirrorX = (f) => (x, y, z) => f(Math.abs(x), y, z)

/** Desplaza la superficie con una función de ruido (circunvoluciones, rugosidad). */
export const displace = (f, g) => (x, y, z) => f(x, y, z) + g(x, y, z)

/** Engrosa/adelgaza: d - r */
export const offset = (f, r) => (x, y, z) => f(x, y, z) - r

/** Cáscara hueca de grosor t. */
export const shell = (f, t) => (x, y, z) => Math.abs(f(x, y, z)) - t

/* ---------------------------- marching cubes ---------------------------- */

// Orden de esquinas y aristas compatible con las tablas de Three.js
const CORNERS = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
]
// arista → [eje (0=x,1=y,2=z), dx, dy, dz]
const EDGES = [
  [0, 0, 0, 0], [1, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0],
  [0, 0, 0, 1], [1, 1, 0, 1], [0, 0, 1, 1], [1, 0, 0, 1],
  [2, 0, 0, 0], [2, 1, 0, 0], [2, 1, 1, 0], [2, 0, 1, 0],
]

/**
 * Convierte una SDF en malla indexada con normales suaves (gradiente de la SDF).
 * bounds: { min: [x,y,z], max: [x,y,z] }, res: tamaño de celda en metros.
 */
/** Escala global de resolución (calidad): >1 genera mallas más ligeras. */
let RES_SCALE = 1
export function setResolutionScale(k) {
  RES_SCALE = k
}

export function polygonize(f, bounds, resolution, opts = {}) {
  const res = resolution * RES_SCALE
  const pad = res * 2
  const ox = bounds.min[0] - pad, oy = bounds.min[1] - pad, oz = bounds.min[2] - pad
  const nx = Math.ceil((bounds.max[0] - bounds.min[0] + 2 * pad) / res) + 1
  const ny = Math.ceil((bounds.max[1] - bounds.min[1] + 2 * pad) / res) + 1
  const nz = Math.ceil((bounds.max[2] - bounds.min[2] + 2 * pad) / res) + 1
  const sxy = nx * ny
  const N = sxy * nz
  const field = new Float32Array(N)

  // Evaluación jerárquica: primero una rejilla gruesa; sólo se evalúa la fina cerca de la superficie.
  const C = 4
  const cnx = Math.ceil(nx / C) + 1, cny = Math.ceil(ny / C) + 1, cnz = Math.ceil(nz / C) + 1
  const coarse = new Float32Array(cnx * cny * cnz)
  for (let k = 0; k < cnz; k++)
    for (let j = 0; j < cny; j++)
      for (let i = 0; i < cnx; i++)
        coarse[i + cnx * (j + cny * k)] = f(ox + i * C * res, oy + j * C * res, oz + k * C * res)
  const near = C * res * 1.25
  for (let k = 0; k < nz; k++) {
    const ck = Math.round(k / C), z = oz + k * res
    for (let j = 0; j < ny; j++) {
      const cj = Math.round(j / C), y = oy + j * res
      for (let i = 0; i < nx; i++) {
        const ci = Math.round(i / C)
        const cv = coarse[ci + cnx * (cj + cny * ck)]
        field[i + nx * j + sxy * k] = Math.abs(cv) > near ? cv : f(ox + i * res, y, z)
      }
    }
  }

  const cache = [new Int32Array(N).fill(-1), new Int32Array(N).fill(-1), new Int32Array(N).fill(-1)]
  const pos = [], nor = [], idx = []

  // gradiente de la rejilla (diferencias centrales) → normales suaves sin reevaluar la SDF
  const grad = (i, j, k, out) => {
    const g = i + nx * j + sxy * k
    const xm = i > 0 ? g - 1 : g, xp = i < nx - 1 ? g + 1 : g
    const ym = j > 0 ? g - nx : g, yp = j < ny - 1 ? g + nx : g
    const zm = k > 0 ? g - sxy : g, zp = k < nz - 1 ? g + sxy : g
    out[0] = field[xp] - field[xm]
    out[1] = field[yp] - field[ym]
    out[2] = field[zp] - field[zm]
  }
  const g0 = [0, 0, 0], g1 = [0, 0, 0]

  const vertexOn = (axis, i, j, k) => {
    const g = i + nx * j + sxy * k
    const cached = cache[axis][g]
    if (cached >= 0) return cached
    const g2 = g + (axis === 0 ? 1 : axis === 1 ? nx : sxy)
    const a = field[g], b = field[g2]
    const t = a / (a - b)
    const x = ox + (i + (axis === 0 ? t : 0)) * res
    const y = oy + (j + (axis === 1 ? t : 0)) * res
    const z = oz + (k + (axis === 2 ? t : 0)) * res
    grad(i, j, k, g0)
    grad(i + (axis === 0 ? 1 : 0), j + (axis === 1 ? 1 : 0), k + (axis === 2 ? 1 : 0), g1)
    const gx = g0[0] + (g1[0] - g0[0]) * t
    const gy = g0[1] + (g1[1] - g0[1]) * t
    const gz = g0[2] + (g1[2] - g0[2]) * t
    const l = Math.hypot(gx, gy, gz) || 1
    const id = pos.length / 3
    pos.push(x, y, z)
    nor.push(gx / l, gy / l, gz / l)
    cache[axis][g] = id
    return id
  }

  const ev = new Int32Array(12)
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let ci = 0
        for (let c = 0; c < 8; c++) {
          const o = CORNERS[c]
          if (field[i + o[0] + nx * (j + o[1]) + sxy * (k + o[2])] < 0) ci |= 1 << c
        }
        const bits = edgeTable[ci]
        if (bits === 0) continue
        for (let ed = 0; ed < 12; ed++) {
          if (bits & (1 << ed)) {
            const E = EDGES[ed]
            ev[ed] = vertexOn(E[0], i + E[1], j + E[2], k + E[3])
          }
        }
        const base = ci << 4
        for (let t = 0; triTable[base + t] !== -1; t += 3) {
          idx.push(ev[triTable[base + t]], ev[triTable[base + t + 2]], ev[triTable[base + t + 1]])
        }
      }
    }
  }
  // oclusión ambiental: cuánto "aire" hay a lo largo de la normal (técnica clásica con SDF),
  // muestreando la rejilla ya calculada con interpolación trilineal (barato)
  const sample = (x, y, z) => {
    const gx = Math.min(nx - 1.001, Math.max(0, (x - ox) / res))
    const gy = Math.min(ny - 1.001, Math.max(0, (y - oy) / res))
    const gz = Math.min(nz - 1.001, Math.max(0, (z - oz) / res))
    const i0 = gx | 0, j0 = gy | 0, k0 = gz | 0
    const fx = gx - i0, fy = gy - j0, fz = gz - k0
    const g = i0 + nx * j0 + sxy * k0
    const c00 = field[g] * (1 - fx) + field[g + 1] * fx
    const c10 = field[g + nx] * (1 - fx) + field[g + nx + 1] * fx
    const c01 = field[g + sxy] * (1 - fx) + field[g + sxy + 1] * fx
    const c11 = field[g + sxy + nx] * (1 - fx) + field[g + sxy + nx + 1] * fx
    return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz
  }
  const nv = pos.length / 3
  const ao = new Float32Array(nv)
  const mode = opts.ao ?? 'full'
  // pasos cortos con la rejilla y largos (cavidades de varios cm) evaluando la SDF real
  const steps = mode === 'full' ? [0.004, 0.012, 0.026, 0.045] : [0.004, 0.012]
  const weights = mode === 'full' ? [0.22, 0.26, 0.3, 0.22] : [0.5, 0.5]
  for (let i = 0; i < nv; i++) {
    if (mode === 'none') {
      ao[i] = 1
      continue
    }
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]
    const ex = nor[i * 3], ey = nor[i * 3 + 1], ez = nor[i * 3 + 2]
    let acc = 0
    for (let k = 0; k < steps.length; k++) {
      const e = steps[k]
      const px = x + ex * e, py = y + ey * e, pz = z + ez * e
      const d = e <= 0.012 ? sample(px, py, pz) : f(px, py, pz)
      acc += weights[k] * Math.max(0, Math.min(1, d / e))
    }
    ao[i] = acc
  }
  return { positions: pos, normals: nor, indices: idx, ao }
}
