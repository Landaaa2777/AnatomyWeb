/**
 * Utilidades de geometría procedural.
 *
 * Todo el modelo anatómico se construye en código (sin archivos .glb externos):
 * cada estructura se acumula en un `MeshBuilder` a partir de primitivas de Three.js,
 * tubos de radio variable (huesos largos, vasos, nervios, músculos) y superficies
 * implícitas (ver `sdf.js`). Unidades: metros, con los pies en y = 0, la cara
 * mirando a +z y el lado izquierdo del cuerpo en +x.
 */
import {
  CatmullRomCurve3,
  Matrix3,
  Matrix4,
  Quaternion,
  Vector3,
  Euler,
  SphereGeometry,
  CylinderGeometry,
  TorusGeometry,
  BoxGeometry,
} from 'three'

export const v3 = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
export const V = (arr) => new Vector3(arr[0], arr[1], arr[2])

const _p = new Vector3()
const _n = new Vector3()
const _nm = new Matrix3()

/** Construye una matriz a partir de posición, rotación (euler, radianes) y escala. */
export function xf(pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale
  return new Matrix4().compose(
    V(pos),
    new Quaternion().setFromEuler(new Euler(rot[0], rot[1], rot[2])),
    V(s),
  )
}

/**
 * Matriz que lleva una primitiva alineada con +Y (centrada en el origen y de altura 1)
 * al segmento a → b, con escala transversal opcional.
 */
export function alignSegment(a, b, sx = 1, sz = sx) {
  const A = Array.isArray(a) ? V(a) : a
  const B = Array.isArray(b) ? V(b) : b
  const dir = B.clone().sub(A)
  const len = dir.length()
  const q = new Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.normalize())
  const mid = A.clone().add(B).multiplyScalar(0.5)
  return new Matrix4().compose(mid, q, v3(sx, len, sz))
}

export class MeshBuilder {
  constructor() {
    this.pos = []
    this.nor = []
    this.idx = []
    this.count = 0
    // oclusión ambiental por vértice (sólo la aportan las mallas SDF; el resto vale 1)
    this.aoChunks = []
  }

  /** Añade una geometría de Three.js transformada por `matrix`. */
  addGeometry(geo, matrix = new Matrix4()) {
    const p = geo.attributes.position
    const n = geo.attributes.normal
    _nm.getNormalMatrix(matrix)
    const flip = matrix.determinant() < 0
    const base = this.count
    for (let i = 0; i < p.count; i++) {
      _p.fromBufferAttribute(p, i).applyMatrix4(matrix)
      _n.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize()
      this.pos.push(_p.x, _p.y, _p.z)
      this.nor.push(_n.x, _n.y, _n.z)
    }
    const pushTri = (a, b, c) =>
      flip ? this.idx.push(base + a, base + c, base + b) : this.idx.push(base + a, base + b, base + c)
    if (geo.index) {
      const ix = geo.index.array
      for (let i = 0; i < ix.length; i += 3) pushTri(ix[i], ix[i + 1], ix[i + 2])
    } else {
      for (let i = 0; i < p.count; i += 3) pushTri(i, i + 1, i + 2)
    }
    this.count += p.count
    geo.dispose()
    return this
  }

  /** Añade buffers crudos (por ejemplo, la salida de marching cubes). */
  addRaw({ positions, normals, indices, ao }) {
    const base = this.count
    if (ao) this.aoChunks.push({ start: base, data: ao })
    for (let i = 0; i < positions.length; i++) this.pos.push(positions[i])
    for (let i = 0; i < normals.length; i++) this.nor.push(normals[i])
    for (let i = 0; i < indices.length; i++) this.idx.push(indices[i] + base)
    this.count += positions.length / 3
    return this
  }

  merge(other) {
    const base = this.count
    this.addRaw({ positions: other.pos, normals: other.nor, indices: other.idx })
    for (const c of other.aoChunks) this.aoChunks.push({ start: base + c.start, data: c.data })
    return this
  }

  /** Devuelve una copia reflejada en el plano x = 0 (lado opuesto del cuerpo). */
  mirrored() {
    const m = new MeshBuilder()
    for (let i = 0; i < this.pos.length; i += 3) {
      m.pos.push(-this.pos[i], this.pos[i + 1], this.pos[i + 2])
      m.nor.push(-this.nor[i], this.nor[i + 1], this.nor[i + 2])
    }
    for (let i = 0; i < this.idx.length; i += 3) m.idx.push(this.idx[i], this.idx[i + 2], this.idx[i + 1])
    m.count = this.count
    m.aoChunks = this.aoChunks.slice()
    return m
  }

  /** Une esta malla con su reflejo (estructuras bilaterales). */
  bilateral() {
    return this.merge(this.mirrored())
  }

  /** Deforma los vértices con fn(Vector3) y recalcula normales por cara si se pide. */
  deform(fn) {
    for (let i = 0; i < this.pos.length; i += 3) {
      _p.set(this.pos[i], this.pos[i + 1], this.pos[i + 2])
      fn(_p)
      this.pos[i] = _p.x
      this.pos[i + 1] = _p.y
      this.pos[i + 2] = _p.z
    }
    return this.recomputeNormals()
  }

  recomputeNormals() {
    const nor = new Float32Array(this.pos.length)
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), ab = new Vector3(), ac = new Vector3()
    for (let i = 0; i < this.idx.length; i += 3) {
      const ia = this.idx[i] * 3, ib = this.idx[i + 1] * 3, ic = this.idx[i + 2] * 3
      a.fromArray(this.pos, ia); b.fromArray(this.pos, ib); c.fromArray(this.pos, ic)
      ab.subVectors(b, a); ac.subVectors(c, a)
      ab.cross(ac)
      for (const k of [ia, ib, ic]) {
        nor[k] += ab.x; nor[k + 1] += ab.y; nor[k + 2] += ab.z
      }
    }
    for (let i = 0; i < nor.length; i += 3) {
      const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]) || 1
      this.nor[i] = nor[i] / l
      this.nor[i + 1] = nor[i + 1] / l
      this.nor[i + 2] = nor[i + 2] / l
    }
    return this
  }

  build() {
    const ao = new Float32Array(this.count).fill(1)
    for (const c of this.aoChunks) ao.set(c.data, c.start)
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      indices: new Uint32Array(this.idx),
      ao,
    }
  }
}

/* ------------------------------------------------------------------ */
/* Primitivas                                                          */
/* ------------------------------------------------------------------ */

export function sphere(mb, pos, radii, rot = [0, 0, 0], seg = 20) {
  const r = typeof radii === 'number' ? [radii, radii, radii] : radii
  return mb.addGeometry(new SphereGeometry(1, seg, Math.max(8, seg * 0.75)), xf(pos, rot, r))
}

export function box(mb, pos, size, rot = [0, 0, 0]) {
  return mb.addGeometry(new BoxGeometry(1, 1, 1), xf(pos, rot, size))
}

export function torus(mb, pos, R, r, rot = [0, 0, 0], arc = Math.PI * 2, scale = [1, 1, 1]) {
  return mb.addGeometry(new TorusGeometry(R, r, 10, 36, arc), xf(pos, rot, scale))
}

export function cylinder(mb, a, b, r1, r2 = r1, seg = 14) {
  return mb.addGeometry(new CylinderGeometry(r2, r1, 1, seg, 1, false), alignSegment(a, b))
}

export function curve(points, tension = 0.5) {
  return new CatmullRomCurve3(points.map((p) => (Array.isArray(p) ? V(p) : p)), false, 'catmullrom', tension)
}

/**
 * Tubo de radio variable a lo largo de una curva.
 *  - radius: número o función r(t) con t ∈ [0, 1]
 *  - opts.flat: relación de aspecto de la sección (elipse) a lo largo del binormal
 *  - opts.up: vector "arriba" para orientar la sección (si no, marcos de Frenet)
 *  - opts.caps: cierra los extremos con tapas planas
 */
/** Escala de detalle de los tubos (calidad): <1 reduce segmentos. */
let TUBE_DETAIL = 1
export function setTubeDetail(k) {
  TUBE_DETAIL = k
}

export function tube(mb, points, radius, opts = {}) {
  const c = typeof points.getPointAt === 'function' ? points : curve(points, opts.tension)
  const seg = Math.max(4, Math.round((opts.segments ?? 40) * TUBE_DETAIL))
  const rad = Math.max(6, Math.round((opts.radial ?? 12) * Math.sqrt(TUBE_DETAIL)))
  const flat = opts.flat ?? 1
  const rf = typeof radius === 'function' ? radius : () => radius
  const up = opts.up ? V(opts.up).normalize() : null
  const frenet = up ? null : c.computeFrenetFrames(seg, false)
  const base = mb.count
  const T = new Vector3(), N = new Vector3(), B = new Vector3(), P = new Vector3()
  const off = new Vector3(), nrm = new Vector3()

  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    c.getPointAt(t, P)
    if (up) {
      c.getTangentAt(t, T)
      N.copy(up).addScaledVector(T, -up.dot(T))
      if (N.lengthSq() < 1e-6) N.set(1, 0, 0).addScaledVector(T, -T.x)
      N.normalize()
      B.crossVectors(T, N)
    } else {
      T.copy(frenet.tangents[i]); N.copy(frenet.normals[i]); B.copy(frenet.binormals[i])
    }
    const r = rf(t)
    for (let j = 0; j < rad; j++) {
      const a = (j / rad) * Math.PI * 2
      const ca = Math.cos(a), sa = Math.sin(a)
      off.copy(N).multiplyScalar(ca * r).addScaledVector(B, sa * r * flat)
      nrm.copy(N).multiplyScalar(ca / 1).addScaledVector(B, sa / flat).normalize()
      mb.pos.push(P.x + off.x, P.y + off.y, P.z + off.z)
      mb.nor.push(nrm.x, nrm.y, nrm.z)
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rad; j++) {
      const j1 = (j + 1) % rad
      const a = base + i * rad + j, b = base + i * rad + j1
      const c0 = base + (i + 1) * rad + j, d = base + (i + 1) * rad + j1
      mb.idx.push(a, b, c0, b, d, c0)
    }
  }
  mb.count += (seg + 1) * rad

  if (opts.caps) {
    for (const end of [0, 1]) {
      c.getPointAt(end, P)
      c.getTangentAt(end, T)
      const sign = end === 0 ? -1 : 1
      const ring = end === 0 ? 0 : seg
      const centre = mb.count
      mb.pos.push(P.x, P.y, P.z)
      mb.nor.push(T.x * sign, T.y * sign, T.z * sign)
      for (let j = 0; j < rad; j++) {
        const k = (base + ring * rad + j) * 3
        mb.pos.push(mb.pos[k], mb.pos[k + 1], mb.pos[k + 2])
        mb.nor.push(T.x * sign, T.y * sign, T.z * sign)
      }
      for (let j = 0; j < rad; j++) {
        const a = centre + 1 + j, b = centre + 1 + ((j + 1) % rad)
        if (end === 0) mb.idx.push(centre, b, a)
        else mb.idx.push(centre, a, b)
      }
      mb.count += rad + 1
    }
  }
  return mb
}

/** Perfil de huso (músculos): 0 en los extremos, máximo en el centro. */
export const spindle = (rMax, rEnd = 0.15, power = 0.7, bias = 0.5) => (t) => {
  const tt = t < bias ? (t / bias) * 0.5 : 0.5 + ((t - bias) / (1 - bias)) * 0.5
  return rMax * (rEnd + (1 - rEnd) * Math.pow(Math.sin(Math.PI * tt), power))
}

/** Perfil de hueso largo: diáfisis delgada y epífisis ensanchadas. */
export const longBone = (rShaft, rTop, rBottom, endLen = 0.12) => (t) => {
  const s = (x) => x * x * (3 - 2 * x)
  if (t < endLen) return rShaft + (rTop - rShaft) * s(1 - t / endLen)
  if (t > 1 - endLen) return rShaft + (rBottom - rShaft) * s((t - (1 - endLen)) / endLen)
  return rShaft
}

/** Interpolación lineal entre puntos [x, y, z] */
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Pseudoaleatorio determinista (para que el modelo sea siempre igual). */
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
