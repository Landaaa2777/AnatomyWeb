/* Web Worker: genera las capas del modelo fuera del hilo principal. */
import { buildLayer } from './build.js'
import { setResolutionScale } from './sdf.js'
import { setTubeDetail } from './mesh.js'
import { QUALITY_PRESETS } from './quality.js'

self.onmessage = (e) => {
  const { layers, quality = 'high' } = e.data
  const q = QUALITY_PRESETS[quality] || QUALITY_PRESETS.high
  setResolutionScale(q.res)
  setTubeDetail(q.tube)
  for (const layer of layers) {
    try {
      const parts = buildLayer(layer, (id) => self.postMessage({ type: 'progress', layer, id }))
      const transfer = []
      for (const p of parts) transfer.push(p.positions.buffer, p.normals.buffer, p.indices.buffer, p.ao.buffer)
      self.postMessage({ type: 'layer', job: layer, parts }, transfer)
    } catch (err) {
      self.postMessage({ type: 'error', layer, message: String(err?.stack || err) })
    }
  }
}
