/**
 * Carga diferida del modelo 3D.
 *
 * Las capas se generan en paralelo en varios Web Workers y se guardan en IndexedDB,
 * de modo que en visitas posteriores el modelo aparece casi al instante.
 * Cada capa se publica en el store en cuanto está lista (revelado progresivo).
 */
import { BufferGeometry, BufferAttribute, Box3, Vector3 } from 'three'
import { create } from 'zustand'
import { QUALITY, QUALITY_PRESETS } from './quality.js'

export const MODEL_VERSION = 10
export const LAYER_ORDER = ['esqueleto', 'organos', 'circulatorio', 'nervioso', 'musculos', 'piel']
// trabajos de generación (el esqueleto se divide en dos) y su coste relativo para repartirlos entre workers
const JOBS = ['esqueleto:axial', 'esqueleto:resto', 'organos', 'circulatorio', 'nervioso', 'musculos', 'piel']
const JOB_COST = { 'esqueleto:axial': 5, 'esqueleto:resto': 3, piel: 5, organos: 1.5, nervioso: 1, musculos: 0.5, circulatorio: 0.5 }
const jobsOf = (layer) => JOBS.filter((j) => j.split(':')[0] === layer)
// orden canónico de las estructuras dentro de cada capa (independiente de qué trabajo termine antes)
const ORDER = {}

export const useModel = create(() => ({
  layers: {}, // layer -> [{ id, layer, geometry, anchor, box }]
  byId: {}, // id -> part
  ready: 0,
  total: LAYER_ORDER.length,
  steps: 0,
  error: null,
}))

/* ------------------------------- IndexedDB ------------------------------- */

const DB = 'anatomia3d'
function idb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore('layers')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
}
async function cacheGet(key) {
  try {
    const db = await idb()
    return await new Promise((res) => {
      const r = db.transaction('layers').objectStore('layers').get(key)
      r.onsuccess = () => res(r.result)
      r.onerror = () => res(undefined)
    })
  } catch {
    return undefined
  }
}
async function cachePut(key, value) {
  try {
    const db = await idb()
    db.transaction('layers', 'readwrite').objectStore('layers').put(value, key)
  } catch {
    /* sin caché: no pasa nada */
  }
}

/* ------------------------------- ensamblado ------------------------------- */

function toParts(raw) {
  return raw.map((p) => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(p.positions, 3))
    geometry.setAttribute('normal', new BufferAttribute(p.normals, 3))
    geometry.setAttribute('ao', new BufferAttribute(p.ao || new Float32Array(p.positions.length / 3).fill(1), 1))
    geometry.setIndex(new BufferAttribute(p.indices, 1))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const box = geometry.boundingBox.clone()
    return { id: p.id, layer: p.layer, geometry, anchor: new Vector3(...p.anchor), box: new Box3().copy(box) }
  })
}

const jobsDone = {}
const completedJobs = new Set()

function publish(job, raw) {
  if (completedJobs.has(job)) return
  completedJobs.add(job)
  const layer = job.split(':')[0]
  const parts = toParts(raw)
  raw.forEach((p, i) => (ORDER[p.id] ??= JOBS.indexOf(job) * 100 + i))
  jobsDone[layer] = (jobsDone[layer] || 0) + 1
  const complete = jobsDone[layer] === jobsOf(layer).length
  useModel.setState((s) => {
    const byId = { ...s.byId }
    for (const p of parts) byId[p.id] = p
    const merged = [...(s.layers[layer] || []), ...parts].sort((a, b) => ORDER[a.id] - ORDER[b.id])
    return { layers: { ...s.layers, [layer]: merged }, byId, ready: s.ready + (complete ? 1 : 0) }
  })
}

let started = null

export function loadAnatomy() {
  if (started) return started
  started = (async () => {
    const pending = []
    for (const job of JOBS) {
      const cached = await cacheGet(`v${MODEL_VERSION}:${QUALITY}:${job}`)
      if (cached) publish(job, cached)
      else pending.push(job)
    }
    if (!pending.length) return

    // reparto equilibrado de trabajos entre workers
    const nWorkers = Math.max(1, Math.min(pending.length, (navigator.hardwareConcurrency || 4) - 1, 4))
    const buckets = Array.from({ length: nWorkers }, () => ({ cost: 0, layers: [] }))
    for (const job of [...pending].sort((a, b) => JOB_COST[b] - JOB_COST[a])) {
      const b = buckets.reduce((m, x) => (x.cost < m.cost ? x : m))
      b.cost += JOB_COST[job]
      b.layers.push(job)
    }

    const onLayer = (job, parts) => {
      publish(job, parts)
      // copia para la caché (los buffers ya pertenecen a las geometrías)
      cachePut(`v${MODEL_VERSION}:${QUALITY}:${job}`, parts)
    }

    try {
      await Promise.all(
        buckets.map(
          (b) =>
            new Promise((resolve, reject) => {
              const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
              let left = b.layers.length
              w.onmessage = (e) => {
                const m = e.data
                if (m.type === 'progress') useModel.setState((s) => ({ steps: s.steps + 1 }))
                else if (m.type === 'layer') {
                  onLayer(m.job, m.parts)
                  if (--left === 0) {
                    w.terminate()
                    resolve()
                  }
                } else if (m.type === 'error') reject(new Error(m.message))
              }
              w.onerror = (e) => reject(e)
              w.postMessage({ layers: b.layers, quality: QUALITY })
            }),
        ),
      )
    } catch (err) {
      // Respaldo: generar en el hilo principal las capas que falten
      console.warn('Worker no disponible, generando en el hilo principal', err)
      const { buildLayer } = await import('./build.js')
      const { setResolutionScale } = await import('./sdf.js')
      const { setTubeDetail } = await import('./mesh.js')
      setResolutionScale(QUALITY_PRESETS[QUALITY].res)
      setTubeDetail(QUALITY_PRESETS[QUALITY].tube)
      for (const job of pending) {
        if (completedJobs.has(job)) continue
        await new Promise((r) => setTimeout(r, 0))
        try {
          onLayer(job, buildLayer(job))
        } catch (e) {
          useModel.setState({ error: String(e) })
        }
      }
    }
  })()
  return started
}
